const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient,ServerApiVersion,ObjectId } = require("mongodb");

// cookie parser
const cookieParser = require('cookie-parser')


const pexelsApi = 'Ox2zuHYaD7EZ0XcDQRjxan1lcCLjBME6snpKgy8SrU0fGQ2Zr3ZuAhUH'


const corsOptions = {
  //origin: ["http://localhost:3000","http://192.168.0.110:3000"],
  origin: true,
  credentials: true
  // allowedHeaders: '*',
};
// const corsOptions = {
//   origin: 'localhost', // or specific origins ['http://example.com', 'http://another.com']
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: '*',
// };


// import * from './uploads'
// media upload middleware
const multer = require('multer')

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const parts = file.originalname.split('.')
    const ext = parts[parts.length-1]
    cb(null, uniqueSuffix+"-"+file.originalname,file.path)
  }
})

const uploadMiddleware = multer({ storage: storage })

// bcrypt
const bcrypt = require('bcrypt');
const saltRounds = 10;
const salt = bcrypt.genSaltSync(saltRounds)

// jwt
var jwt = require('jsonwebtoken');
const privateKey='hwdbkljdbeqjdbvuhew7hklsdu7'

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const path = require('path')

// express static for accessing static media files
app.use('/uploads',express.static(path.join(__dirname,'/uploads')))

console.log("server started!")

const url = "mongodb+srv://virajngr:virajngr@cluster0.idyku6z.mongodb.net/?retryWrites=true&w=majority"
const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


app.get('/dbcheck',(req,res)=>{
  async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
      res.status(200).send("Pinged your deployment. You successfully connected to MongoDB!")
    } finally {
      // Ensures that the client will close when you finish/error
      await client.close();
    }
  }
  run().catch(console.dir);
  // run().catch(res.status(400).send(console.dir))
})

app.post('/register',(req,res)=>{
    console.log('register endpoint reached')

    async function run() {
        try {
          // Connect the client to the server	(optional starting in v4.7)
          await client.connect();
          // Send a ping to confirm a successful connection
          let pingres = await client.db("Blog").command({ ping: 1 });
          console.log("Pinged your deployment. You successfully connected to MongoDB!",pingres.ok);
          const myDB = client.db("Blog");
          const myColl = myDB.collection("Users");
          
          const data ={
            "username":req.body.username,
            "password":bcrypt.hashSync(req.body.password2,salt)
            };
          // const doc = { name: "Neapolitan pizza", shape: "round" };
          const result = await myColl.insertOne(data)
//            console.log(`A document was inserted with the _id: ${result.insertedId}`);
          //res.send('doc created ID- ',result.insertedI)
          res.status(200).send(`A document was inserted with the _id: ${result.insertedId} and username ${data.username}`)
        } finally {
          // Ensures that the client will close when you finish/error
            await client.close();
        }
      }
      run().catch(console.dir);

    // res.json('test ok2');
    console.log('end of block')
})


// login endpoint
app.post('/login',async (req,res)=>{
    console.log('login endpoint')
    async function run() {
        try {
          // Connect the client to the server	(optional starting in v4.7)
          await client.connect();
          // Send a ping to confirm a successful connection
          let pingres = await client.db("Blog").command({ ping: 1 });
          console.log("Pinged your deployment. You successfully connected to MongoDB!",pingres.ok);
          
          const myDB = client.db("Blog");
          const myColl = myDB.collection("Users");
          
          const {username,password}=req.body

          // const doc = { name: "Neapolitan pizza", shape: "round" };
          const userDoc = await myColl.findOne({username})

          console.log('userfindOne',userDoc)
          if (userDoc != null){ 
              const passOk = bcrypt.compareSync(password,userDoc.password)
              console.log('passwordcheck',passOk)
              if (passOk){
                  jwt.sign({ username,id:userDoc._id }, privateKey, {}, function(err, token) {
                      if (err) {console.log(err)}
                      else{
                          res.cookie('token',token).json({
                            id:userDoc._id,
                            username
                          })
                        }
                    });
                }else{
                    res.status(401).send('Incorrect Password')
                }
            }
            else{
                res.status(401).send('User not found')              
            }


        } finally {
          // Ensures that the client will close when you finish/error
            await client.close();
        }
      }
      run().catch(console.dir);
})

// endpoint to check if user has logged in or not
app.get('/profile',(req,res)=>{
    const {token} = req.cookies;
    console.log(token)
    jwt.verify(token,privateKey,{},(err,info)=>{
        if (err) {console.log('.get prof token error',err)}
        else{
          res.json(info) 
          console.log('profile req')
        }
    })
})

// logout
app.post('/logt',(req,res)=>{
  res.clearCookie('token')
  res.send('token test clearcookie')
})


// post requuest for new post creation
app.post('/post' , uploadMiddleware.single('file'),(req,res)=>{

  var {title,summary,content,authorUsername,authorId,createdAt,updatedAt,isEdited}=req.body

  var path = req.file.path
  // console.log(path)
  path = path.replace(/\\/g, '/')
  if (updatedAt=='null'){ 
    updatedAt = createdAt
  }

  var data = {title,summary,content,authorUsername,authorId,createdAt,"cover":path,updatedAt,isEdited}
  console.log(data)
  async function run(){
    try{
      // need to connect to the database
      await client.connect()

      // defining db and collection names
      const myDb = client.db('Blog')
      const myColl = myDb.collection('posts')

      try {
        const result = await myColl.insertOne(data)
        console.log(result)
        res.status(200).send('post saved')
      } catch (error) {
        res.status('post could not be saved',error)
      }

      

    }finally{
      await client.close();
    }
  }run().catch(console.dir)

})


// see all posts
app.get('/allposts',(req,res)=>{
  res.header("Access-Control-Allow-Origin", "*");
  console.log('allposts')
  async function run(){
    try {
      await client.connect()
      const myDb = client.db('Blog')
      const myColl = myDb.collection('posts')
      const all = await myColl.find({}).sort({_id:-1}).toArray()
      // console.log(all)

      res.status(200).send(all)
      
    } catch (error) {
      
    }
  }run().catch(console.dir)
})


app.post('/getpost/:id',(req,res)=>{

  async function run(){
    try {
      await client.connect()
      const myDb = client.db('Blog')
      const myColl = myDb.collection('posts')
      const id = req.params.id.trim(' ')
      // mongodb querries
      const oid = new ObjectId(id)
      const post  = await myColl.findOne({_id: oid})//.toArray()
      res.json(post)
//      console.log(post)
      
    } finally  {
      client.close()
    }
  }run().catch(console.dir)
  
  // res.json('kaye okok')

})

// edit the blog post
app.put('/edit/:id',uploadMiddleware.single('file'),(req,res)=>{
  console.log('edit body',req.body)
  const docId = req.body.docId
  // res.status(200).json({'test':'okok','id':docId})

  const {token} =  req.cookies
  console.log(token)
  jwt.verify(token,privateKey,{},(err,info)=>{
      let newData = {}
     if (err) {console.log('token error',err)}
     else
     {
       console.log('update jwt verified',info.id)
       let ts = new Date();
       const {title,summary,content} = req.body
       if (req.file){
         const file = req.file
         var path = file.path
         console.log('file',file.path)
         path = path.replace(/\\/g, '/')
         newData = {title,summary,content,'cover':path,'updatedAt':ts.toISOString(),'isEdited':true}
         console.log('newd test with img',newData)
         // var newD = { $set : {newData}}
        }
        else{
          newData = {title,summary,content,'updatedAt':ts.toISOString(),'isEdited':true}
          console.log('newd test w/o img',newData)
          // var newD = { $set:{newData}}
        }
        
      // connecting to database to update the blogpost
      async function run(){
        try {
          console.log('inside client conn,',newData)
          await client.connect()
          myDb = client.db('Blog')
          myColl = myDb.collection('posts')
          const oid = new ObjectId(docId)

          const updateResult = await myColl.updateOne(
            // custom querry
            {_id: oid},
            // new values
            {$set:newData}
          )
          
           console.log('update res- ',updateResult)
        
        } finally {
           client.close()
        
         }
      }run().catch(console.dir)
     }
 })
   
})


app.get('/userposts/:id',(req,res)=>{

    console.log(req.params.id)
    console.log(req.params.id.trim(' '))
    if(req.params.id.trim(' ') === 'undefined'){
      res.send('reload')
      return
    }

    async function run(){
      try {
        await client.connect()
        const myDb = client.db('Blog')
        const postColl = myDb.collection('posts')
        const userColl = myDb.collection('Users')
        const id = req.params.id.trim(' ')
       // mongodb querries
       const post  = await postColl.find({authorId:id}).toArray()
       //const oid = new ObjectId('64cc1d827bb306437dec1ad1')
       const oid = new ObjectId(id)
       console.log(oid)
       const userInfo = await userColl.find({_id:oid}).toArray()
       const username = userInfo[0].username
       res.json({post,username})
    
     } finally  {
       client.close()
     }
   }run().catch(console.dir)

})

app.put('/likepost/:id',(req,res)=>{
  let postId = req.params.id.trim()
  console.log('triimed post id like url',postId)
})

app.delete('/deletepost/:articleId',(req,res)=>{
  const articleId = req.params.articleId.trim('')
  
  async function run(){  
    try {
      await client.connect()
      const blogDb = client.db('Blog')
      const postsColl = blogDb.collection('posts')
      const articleObjId = new ObjectId(articleId)
      const query = {_id:articleObjId}
      const delPost = await postsColl.deleteOne(query) 
      
      if (delPost.deletedCount === 1) {
        console.log("Successfully deleted one document.");
        res.json('deleted')
      } else {
        console.log("No documents matched the query. Deleted 0 documents.");
        res.json('not deleted')
      }

    } finally {
      client.close()
    }
  }
  run().catch(console.dir)

})



app.listen(9000,'0.0.0.0' || localhost ,()=>{console.log("ready @ 9000");})

