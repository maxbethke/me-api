import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Client } from "@notionhq/client";
import dotenv from 'dotenv';

dotenv.config()

const app = express();
const port = 3001
app.use(cors());

const notion = new Client({ auth: process.env.NOTION_KEY })

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/techstack', async (req, res) => {
    const notionResponse = await queryDatabase(res, process.env.NOTION_DATABASE_ID_TECHSTACK)

    const pages = notionResponse.results.map(page => {return {
        name: page.properties.Name.title[0].plain_text,
        exp: page.properties["Experience /10"].number,
        field: page.properties.Field.select.name
    }})

    res.send(pages)
});

app.get('/tools', async (req, res) => {
    const notionResponse = await queryDatabase(res, process.env.NOTION_DATABASE_ID_TOOLS)

    const pages = notionResponse.results.map(page => {return {
        name: page.properties.Name.title[0].plain_text
    }})

    res.send(pages)
});

async function queryDatabase(res, databaseId, filter = undefined, sorts = undefined) {
    try {
        return await notion.databases.query({
            database_id: databaseId,
            filter: filter,
            sorts: sorts,
        });
    } catch (e) {
        console.error(e)
        res.status(500).send('Failed to request an upstream service!')
    }
}

app.listen(port, () => console.log(`App listening on port ${port}!`));
