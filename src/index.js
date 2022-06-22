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
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const EXPERIENCE_DATABASES = [
    {path: '/techstack', databaseId: process.env.NOTION_DATABASE_ID_TECHSTACK},
    {path: '/tools', databaseId: process.env.NOTION_DATABASE_ID_TOOLS},
    {path: '/languages', databaseId: process.env.NOTION_DATABASE_ID_LANGUAGES},
    {path: '/softskills', databaseId: process.env.NOTION_DATABASE_ID_SOFTSKILLS}
]
const PROJECT_DATABASE_ID = process.env.NOTION_DATABASE_ID_PROJECTS

app.get(
    EXPERIENCE_DATABASES.map(item => item.path),
    async (req, res) => {
        try {
            res.send(await getExperience(req.path))
        } catch (e) {
            console.error(e)
            if(e instanceof UpstreamServiceError) {
                return res.status(500).send('Failed to request an upstream service!')
            }

            return res.status(500).send('An unexpected error occurred')
        }
    }
);

async function getExperience(database) {
    const databaseId = EXPERIENCE_DATABASES.find(item => item.path===database).databaseId
    const notionResponse = await queryDatabase(databaseId)

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

async function queryDatabase(databaseId, filter = undefined, sorts = undefined) {
    try {
        return await notion.databases.query({
            database_id: databaseId,
            filter: filter,
            sorts: sorts,
        });
    } catch (e) {
        throw new UpstreamServiceError(e)
    }
}

app.listen(port, () => console.log(`App listening on port ${port}!`));
