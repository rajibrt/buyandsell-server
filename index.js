const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
        const bookedCollection = client.db('buyandsell').collection('bookedMobile')
        const paymentsCollection = client.db('buyandsell').collection('payments')


        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send('forbidden access');

            }

            next();
        }

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

        };

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookedCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.salesPrice;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });

        })

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

        app.get('/allbookedphone', async (req, res) => {
            const query = {};
            const allbooked = await bookedCollection.find(query).toArray();
            res.send(allbooked);
        });

        app.get('/buyerbookedphone', verifyJWT, async (req, res) => {
            const buyer = req.query.buyer;
            const decodedEmail = req.decoded.email;

            if (buyer !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = { buyer: buyer }
            const bookedPhone = await bookedCollection.find(query).toArray();
            res.send(bookedPhone);
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
        });

        app.put('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        });

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'Seller' });
        })
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role === 'Buyer' });
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

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const role = req.query.role;
            console.log(role);
            const query = { role: role };
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })

        app.get('/allusers', async (req, res) => {
            const query = {};
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })
        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
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

        app.post('/bookedMobile', async (req, res) => {
            const bookedMobile = req.body;
            const result = await bookedCollection.insertOne(bookedMobile);
            res.send(result);
        });

        app.delete('/allmobile/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await mobileCollection.deleteOne(filter);
            res.send(result);
        })

        app.get('/brand', async (req, res) => {
            const query = {}
            const result = await brandCollection.find(query).project({ brand: 1 }).toArray();
            res.send(result);
        });


        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const booking = await bookedCollection.findOne(query);
            res.send(booking);
        })


    }
    finally {

    }
}

run().catch(console.log);

app.get('/', async (req, res) => {
    res.send('buy and sell server running')

})

app.listen(port, () => console.log(`Buy and Sell running on port ${port}`))