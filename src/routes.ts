import express from 'express'
import UpstreamServiceError from "./UpstreamServiceError.js";
import {getExperience, getProjects} from "./notion.js";
import {updateCache} from "./cache";

const router = express.Router()

export type collection = {
  path: string,
  databaseId: string,
  processingFunction: Function
}

const collections: collection[] = [
    {path: '/techstack', databaseId: process.env.NOTION_DATABASE_ID_TECHSTACK!, processingFunction: getExperience},
    {path: '/tools', databaseId: process.env.NOTION_DATABASE_ID_TOOLS!, processingFunction: getExperience},
    {path: '/languages', databaseId: process.env.NOTION_DATABASE_ID_LANGUAGES!, processingFunction: getExperience},
    {path: '/softskills', databaseId: process.env.NOTION_DATABASE_ID_SOFTSKILLS!, processingFunction: getExperience},
    {path: '/projects', databaseId: process.env.NOTION_DATABASE_ID_PROJECTS!, processingFunction: getProjects},
    {path: '/principles', databaseId: process.env.NOTION_DATABASE_ID_PRINCIPLES!, processingFunction: getExperience}
]

router.get(
    collections.map(item => item.path),
    async (req, res) => {
        const collection = collections.find(item => item.path===req.path)

        try {
          res.send(await updateCache(collection!))
        } catch (e) {
            console.error(e)
            if(e instanceof UpstreamServiceError) {
                return res.status(500).send('Failed to request an upstream service!')
            }

            return res.status(500).send('An unexpected error occurred')
        }
    }
);

export default router
