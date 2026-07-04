import express from 'express'
import { chatbot } from './OpenAI.controller.js'

const router = express.Router()


router.post('/start',chatbot)





export default router