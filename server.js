
const express = require("express");
const cors = require('cors');
const multer = require('multer')
require('dotenv').config();

PORT = process.env.PORT || 5000

// const mysql = require('mysql');
const app = express();
const mysql = require('mysql2');

app.use(express.json());

// Use cors middleware with specific configuration
app.use(cors({
  origin: "*"
}));

console.log(process.env.HOST);
console.log(process.env.USER);
console.log(process.env.PASSWORD);
console.log(process.env.DATABASE);

const pool = mysql.createPool({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error getting a database connection:', err);
  }else{
    console.log("connectionn successful");
  }
});

// Create storage object to set filename and destination
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./src/upload");
  },
  filename: function (req, file, cb) {
    const currentDate = Date.now();
    const filename = `${currentDate}-${file.originalname}`;

    cb(null, filename);
  },
});

const upload = multer({ storage });

app.use(express.json());

// Handle file upload and insert teacher details
app.post('/admin/editfaculty', upload.single('myfile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const values = [
    req.body.name,
    req.body.qualification,
    req.body.mobile,
    req.file.filename,
  ];
  const sql = 'INSERT INTO teacher (name, qualification, mobile, image) VALUES (?, ?, ?, ?)';

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    connection.query(sql, values, (err, result) => {
      connection.release(); // Release the connection back to the pool

      if (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      return res.status(200).send();
    });
  });
});

// REnder faculty details
app.get("/facultydata", (req, res) => {

  sql = `select * from teacher`;

  pool.query(sql, (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json(results);
  })
})

// login Route
app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // Perform the login validation here (e.g., check against a database)
  const sql = `SELECT * FROM admin_login WHERE userid = ? AND password = ?`;

  pool.query(sql, [email, password], (error, results) => {
    if (results.length > 0) {
      // Valid login credentials, send a success response
      return res.status(200).json({ success: true, message: 'Login successful' });
    }
    else {
      // Invalid login credentials, send an error response
      return res.json({ success: false, message: 'Invalid email or password' });
    }
  });
});

//Admission Request
app.get('/admin/admission', (req, res) => {
  const sql = "SELECT * FROM admission_req";
  pool.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    // Send the retrieved data as JSON response
    res.json(results);
  });
});

//fetch student details
app.get('/admin/studentdata', (req, res) => {

  const selectedClas = req.query.clas;
  const sql = `SELECT * FROM ${selectedClas}`;
  pool.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    // Send the retrieved data as JSON response
    res.json(results);
  });
});


// route for admission request
app.post('/admission', (req, res) => {
  console.log("admission route")

  const sql = "INSERT INTO admission_req(`name`, `mobile`, `gender`,`class`,`pay_method`) VALUES (?,?,?,?,?)";
  const value = [
    req.body.nam,
    req.body.mobile,
    req.body.gender,
    req.body.clas,
    req.body.payment
  ]


  // get connection Object
  pool.getConnection((err, connection) => {
    // execute query using connection object
    connection.query(sql, value, (err, data) => {
      if(err){
        console.log(err);
      }
      connection.release(); // Release the connection when done
      console.log("Student data inserted");
      return res.json(data);
    });
  });
})


//when admin click on approve then this route works
app.post('/admin/approve/:roll/:clas', (req, res) => {
  const roll = req.params.roll;
  const clas = req.params.clas.toLowerCase(); // Convert to lowercase

  let table_name = "";
  let values = [roll];

  if (clas === "lkg") {
    table_name = "lkg";
  } else if (clas === "ukg") {
    table_name = "ukg";
  } else if (clas === "nursery") {
    table_name = "nursery";
  }

  const sql = `
      INSERT INTO ${table_name} (name, mobile, gender, class, pay_method)
      SELECT name, mobile, gender, class, pay_method
      FROM admission_req
      WHERE roll = ?;
    `;

  // If the insertion is successful, you can optionally delete the record from admission_req
  const deleteSql = "DELETE FROM admission_req WHERE roll = ?";

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: 'Database connection error' });
    }
    // execute insertion operation
    connection.query(sql, values, (err, results) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: 'Database error' });
      }

      // execute delete operation
      connection.query(deleteSql, [roll], (deleteErr, deleteResults) => {
        connection.release();

        if (deleteErr) {
          return res.status(500).json({ error: 'Database error' });
        }

        return res.status(200).json({ message: 'Admission approved and record deleted' });
      });
    });
  });
});


app.listen(PORT, () => {
  console.log("server running on 5000")
});
