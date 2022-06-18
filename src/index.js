import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Client } from "@notionhq/client";
import dotenv from 'dotenv';

dotenv.config()

const app = express();
const port = 3001
const notion = new Client({ auth: process.env.NOTION_KEY });

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const DATABASE_IDS = {
    techstack: process.env.NOTION_DATABASE_ID_TECHSTACK,
    tools: process.env.NOTION_DATABASE_ID_TOOLS,
    languages: process.env.NOTION_DATABASE_ID_LANGUAGES,
    softskills: process.env.NOTION_DATABASE_ID_SOFTSKILLS
}

app.get('/:database', async (req, res) => {
    if(!DATABASE_IDS.hasOwnProperty(req.params.database)) return res.status(404).send()

    const notionResponse = await queryDatabase(res, DATABASE_IDS[req.params.database])
    if(!notionResponse) return

    const pages = notionResponse.results.map(page => {
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
