import UpstreamServiceError from "./UpstreamServiceError.js";
import {Client} from "@notionhq/client";
import dotenv from 'dotenv';

dotenv.config()

const notion = new Client({ auth: process.env.NOTION_KEY });

export async function getExperience(database) {
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

export async function getProjects(database) {
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
            case 'multi_select':
                let selectedItems = []

                for(const selectItem of prop['multi_select']) {
                    selectedItems.push({
                        text: selectItem.name,
                        color: selectItem.color
                    })
                }

                item[propName.toLowerCase()] = selectedItems
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
