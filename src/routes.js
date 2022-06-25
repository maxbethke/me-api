import express from 'express'
import UpstreamServiceError from "./UpstreamServiceError.js";
import { getExperience, getProjects } from "./notion.js";

const router = express.Router()

const DATABASES = [
    {path: '/techstack', databaseId: process.env.NOTION_DATABASE_ID_TECHSTACK, processingFunction: getExperience},
    {path: '/tools', databaseId: process.env.NOTION_DATABASE_ID_TOOLS, processingFunction: getExperience},
    {path: '/languages', databaseId: process.env.NOTION_DATABASE_ID_LANGUAGES, processingFunction: getExperience},
    {path: '/softskills', databaseId: process.env.NOTION_DATABASE_ID_SOFTSKILLS, processingFunction: getExperience},
    {path: '/projects', databaseId: process.env.NOTION_DATABASE_ID_PROJECTS, processingFunction: getProjects}
]

router.get(
    DATABASES.map(item => item.path),
    async (req, res) => {
        const database = DATABASES.find(item => item.path===req.path)

        try {
            res.send(await database.processingFunction(database))
        } catch (e) {
            console.error(e)
            if(e instanceof UpstreamServiceError) {
                console.error(e)
                return res.status(500).send('Failed to request an upstream service!')
            }

            return res.status(500).send('An unexpected error occurred')
        }
    }
);

export default router
