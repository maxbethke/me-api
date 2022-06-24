import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Client } from "@notionhq/client";
import dotenv from 'dotenv';
import UpstreamServiceError from "./UpstreamServiceError.js";

dotenv.config()

const app = express();
const port = 3001
const notion = new Client({ auth: process.env.NOTION_KEY });

app.use(cors());

const DATABASES = [
    {path: '/techstack', databaseId: process.env.NOTION_DATABASE_ID_TECHSTACK, processingFunction: getExperience},
    {path: '/tools', databaseId: process.env.NOTION_DATABASE_ID_TOOLS, processingFunction: getExperience},
    {path: '/languages', databaseId: process.env.NOTION_DATABASE_ID_LANGUAGES, processingFunction: getExperience},
    {path: '/softskills', databaseId: process.env.NOTION_DATABASE_ID_SOFTSKILLS, processingFunction: getExperience},
    {path: '/projects', databaseId: process.env.NOTION_DATABASE_ID_PROJECTS, processingFunction: getProjects}
]

// HTTP Basic Auth
app.all('*', (req, res, next) => {
    if(!req.headers.authorization || req.headers.authorization === '') return respond401(res)

    const b64auth = (req.headers.authorization).split(' ')[1]
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')
    const user = process.env.HTTP_USER
    const secret = process.env.HTTP_SECRET

    if (login && password && login === user && password === secret) {
        return next()
    }

    respond401(res)
})

app.get(
    DATABASES.map(item => item.path),
    async (req, res) => {
        const database = DATABASES.find(item => item.path===req.path)

        try {
            res.send(await database.processingFunction(database))
        } catch (e) {
            console.error(e)
            if(e instanceof UpstreamServiceError) {
                return res.status(500).send('Failed to request an upstream service!')
            }

            return res.status(500).send('An unexpected error occurred')
        }
    }
);

const respond401 = (res) => {
    res.status(401).send("Authorization required")
}

async function getExperience(database) {
    const notionResponse = await queryDatabase(database)

    let pages = notionResponse.results.filter(page => page.properties.Name.title.length > 0)

    pages = pages.map(page => {
        let item = {
            name: page.properties.Name.title[0].plain_text
        }

        if(page.properties.hasOwnProperty("Experience /10")) {
            item.exp = page.properties["Experience /10"].number
        }

        if(page.properties.hasOwnProperty("Field")) {
            item.field = page.properties.Field.select.name
        }

        return item
    })

    return pages
}

async function getProjects(database) {
    const notionResponse = await queryDatabase(database)

    let pages = notionResponse.results.filter(page => page.properties.Name.title.length > 0)
    let mappedPages = []

    for(const page of pages) {
        let mappedPage = await getProjectProperties(page)
        mappedPage.contentBlocks = await getProjectContentBlocks(page)
        mappedPages.push(mappedPage)
    }

    return mappedPages
}

async function getProjectProperties(page) {
    let item = {
        name: page.properties.Name.title[0].plain_text
    }

    for (const propName in page.properties) {
        const prop = page.properties[propName]
        switch (prop.type) {
            case 'relation':
                const relatedPages = []

                for(const relation of prop.relation) {
                    relatedPages.push(await getNotionPage(relation.id))
                }
                item[propName.toLowerCase()] = relatedPages.map(page => ({
                    name: page.properties.Name.title[0].plain_text,
                    field: page.properties.Field ? page.properties.Field.select.name : null
                }))
                break;
            case 'select':
                item[propName.toLowerCase()] = {
                    text: prop.select.name,
                    color: prop.select.color
                }
                break;
            case 'date':
                if(!prop.date) break;
                const dateIsInPast = new Date(prop.date.start).getTime() < Date.now()
                if(dateIsInPast) item[propName.toLowerCase()] = prop.date.start
                break;
        }
    }

    return item
}

async function getProjectContentBlocks(page) {
    let blocks = await getNotionBlocks(page.id)

    blocks = blocks.results
    blocks = blocks.map(block => getBlockContent(block))

    return blocks
}

function getBlockContent(block) {
    if(block.object !== 'block') throw Error('Tried to get content of non-block')
    return {
        type: block.type,
        content: block[block.type].rich_text
    }
}

async function queryDatabase(database, filter = undefined, sorts = undefined) {
    try {
        return await notion.databases.query({
            database_id: database.databaseId,
            filter: filter,
            sorts: sorts,
        });
    } catch (e) {
        throw new UpstreamServiceError(e)
    }
}

async function getNotionPage(pageId) {
    try {
        return await notion.pages.retrieve({
            page_id: pageId
        });
    } catch (e) {
        throw new UpstreamServiceError(e)
    }
}

async function getNotionBlocks(blockId) {
    try {
        return await notion.blocks.children.list({
            block_id: blockId
        });
    } catch (e) {
        throw new UpstreamServiceError(e)
    }
}

app.listen(port, () => console.log(`App listening on port ${port}!`));
