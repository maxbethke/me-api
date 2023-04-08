import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config()

const app = express();

app.use(cors());

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

const respond401 = (res: any) => {
    console.log('Rejected unauthorized request')
    res.status(401).send("Authorization required")
}

app.use(routes)

if (process.env.NODE_ENV === 'dev') {
    const port = process.env.NODE_PORT
    app.listen(port, () => console.log(`App listening on port ${port}!`));
}

const serverlessExpress = require('@vendia/serverless-express')
exports.handler = serverlessExpress({ app })
