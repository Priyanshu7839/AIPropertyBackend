import express from 'express' 
import dotenv from 'dotenv'
import tests from './test.js'
import PropertiesRouter from './Properties/Properties.routes.js'
import ChatRouter from './OpenAIApis/OpenAI.routes.js'
import CompleteProfile from './Auth/CompleteProfile.routes.js'
import cors from 'cors'

dotenv.config()

const corsOptions = {
    origin:[
        'http://localhost:3000',
        'https://aipropertyreport.com/',
        'https://aipropertyreport.com',
        'https://localhost',
        'capacitor://localhost'
    ],
    credentials:true,
    methods:['GET',"POST","PUT","DELETE","OPTIONS"],
    allowedHeaders: ['Content-Type','Authorization']

}


const app = express()
tests.testSupabase()
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions))


app.use('/properties',PropertiesRouter)
app.use('/chat',ChatRouter)
app.use('/auth',CompleteProfile)



const PORT = 8002

app.listen(PORT,()=>{
    console.log(`Server started at Port ${PORT}`)
})