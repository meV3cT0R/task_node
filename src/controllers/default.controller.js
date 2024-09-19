const sql = require('mssql')
const jwt = require('jsonwebtoken')
const { errorM } = require('../utils/error/genericErrorHandling')
const { jsonM } = require('../utils/messageUtils')
const { postHelper } = require('../utils/requestHelpers/postHelper')
const { bodyParser } = require('../middlewares/bodyParser')

require('dotenv').config()

const secure_endpoint = (req, res, params) => {
  console.log('on secure end point')
  res.setHeader('Content-Type', 'application/json')

  const auth = req.headers['Authorization'] || req.headers['authorization']
  console.log(`checking authorization header : ${auth}`)
  if (!auth) {
    res.statusCode = 401
    res.end(
      JSON.stringify({
        message: 'unauthorized'
      })
    )
    return
  }
  console.log('verifying jwt')
  const token = auth.split(' ')[1]
  console.log(token)
  try {
    jwt.verify(token, process.env.SECRET_KEY)
  } catch (err) {
    console.log(err)
    res.statusCode = 403
    res.end(
      JSON.stringify({
        message: err.message || err
      })
    )
    return
  }

  const decoded_data = jwt.decode(token)
  sql.query(
    `Select * from users where username='${decoded_data.username}' and pwd='${decoded_data.pwd}'`,
    (err, result) => {
      if (err) {
        errorM(res, err)
        return
      }
      if (result.recordset.length == 0) {
        jsonM(res, 403, 'jwt malformed')
        return
      }
      delete result.recordset[0]['pwd']

      // const base64Image = result.recordset[0]["image"];
      // const chunkSize = 1024 
      // const totalChunks = Math.ceil(base64Image.length / chunkSize)
      // const chunks = []

      // for (let i = 0; i < totalChunks; i++) {
      //   chunks.push(base64Image.slice(i * chunkSize, (i + 1) * chunkSize))
      // }

      res.end(
        JSON.stringify({
          message: 'Welcome to secure endpoint :D',
          data: {
            ...result.recordset[0],
            // chunks,
            // totalChunks
          }
        })
      )
    }
  )
}

const login = (req, res, params) => {
  res.setHeader('Content-Type', 'application/json')

  let body = []
  req
    .on('data', chunk => {
      body.push(chunk)
      console.log('Parsing Request Body')
    })
    .on('end', () => {
      body = JSON.parse(Buffer.concat(body).toString())
      console.log('body : ', body)
      sql.query(
        `select * from users where username='${body.username}' and pwd='${body.pwd}'`,
        (err, result) => {
          if (err) {
            res.statusCode = 500
            if (err instanceof Error) {
              res.end(
                JSON.stringify({
                  message: err.message
                })
              )
              return
            }
            res.end(
              JSON.stringify({
                message: err
              })
            )
          }
          if (result.recordset.length == 0) {
            res.statusCode = 400
            res.end(
              JSON.stringify({
                message: 'username or password invalid'
              })
            )
            return
          }
          console.log(result.recordset)
          res.statusCode = 200
          delete result.recordset[0]["image"]
          jwt.sign(
            {
              ...result.recordset[0]
            },
            process.env.SECRET_KEY,
            (err, token) => {
              res.end(
                JSON.stringify({
                  message: 'Login Success',
                  token: token
                })
              )
            }
          )
        }
      )
    })
}

const signup = (req, res, params) => {
  res.setHeader('Content-Type', 'application/json')
  postHelper(req,res,params,["name","username","gender","phone","pwd","image"],"users")
}
module.exports = { secure_endpoint, login, signup }
