const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 4000;

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wx23zka.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const brandCollection = client.db('buyandsell').collection('category')
        const usersCollection = client.db('buyandsell').collection('users')
        const mobileCollection = client.db('buyandsell').collection('mobile')


        function verifyJWT(req, res, next) {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).send('unauthorized access');
            }

            const token = authHeader.split(' ')[1];

            jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
                if (err) {
                    return res.status(403).send(message, 'forbidden access')
                }
                req.decoded = decoded;
                next();

            })

        }

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            console.log('token', req.headers.authorization);
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '30d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })

        });

        app.get('/category', async (req, res) => {
            const query = {};
            const category = await brandCollection.find(query).toArray();
            res.send(category);
        })

        app.get('/brand/:id', (req, res) => {
            const id = req.params.brand;
            const query = { brand: ObjectId(id) }
            const singleMobile = mobileCollection.find(query);
            res.send(singleMobile);
        })

        app.get('/myphone', verifyJWT, async (req, res) => {
            const seller = req.query.seller;
            const decodedEmail = req.decoded.email;

            if (seller !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = { seller: seller }
            const myphone = await mobileCollection.find(query).toArray();
            res.send(myphone);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role == 'admin' });
        })
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role == 'Sell' });
        })
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role == 'Buy' });
        })

        app.get('/allmobile', async (req, res) => {
            const query = {};
            const allmobile = await mobileCollection.find(query).toArray();
            res.send(allmobile);
        });


        app.get('/mobile/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const selectedMobile = await mobileCollection.findOne(query);
            res.send(selectedMobile);
        })

        app.get('/brandcollection', async (req, res) => {
            const brand = req.query.brand;
            console.log(brand);
            const query = { brand: brand };
            const brandcollection = await mobileCollection.find(query).toArray();
            res.send(brandcollection);
        })

        // app.get('/brand/:id', (req, res) => {
        //     const id = req.params.id;
        //     const selectedNews = news.filter(n => n._id === id);
        //     res.send(selectedNews);
        // });

        app.post('/allmobile', async (req, res) => {
            const mobile = req.body;
            const result = await mobileCollection.insertOne(mobile);
            res.send(result);
        });

        app.get('/brand', async (req, res) => {
            const query = {}
            const result = await brandCollection.find(query).project({ brand: 1 }).toArray();
            res.send(result);
        });




    }
    finally {

    }
}

run().catch(console.log);

app.get('/', async (req, res) => {
    res.send('buy and sell server running')

})

app.listen(port, () => console.log(`Buy and Sell running on port ${port}`))