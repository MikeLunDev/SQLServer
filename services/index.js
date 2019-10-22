const express = require("express");
const connection = require("../db");
const Request = require("tedious").Request;
const Types = require("tedious").TYPES;
const multer = require("multer");
const fs = require("fs-extra");
const router = express.Router();

/* PRODUCT ROUTS */
router.get("/", async (req, res) => {
  var selectProducts = `
  SELECT * FROM products 
  ORDER BY _id OFFSET ((@PageNumber - 1) * @RowsPerPage) ROWS
  FETCH NEXT @RowsPerPage ROWS ONLY`;
  var request = new Request(selectProducts, err => {
    if (err) res.status(500).send(err);
    else res.send(products);
  });
  var products = [];
  request.on("row", columns => {
    var product = {};
    columns.forEach(column => {
      product[column.metadata.colName] = column.value;
    });
    products.push(product);
  });
  request.addParameter("PageNumber", Types.Int, req.query.page || 1);
  request.addParameter("RowsPerPage", Types.Int, req.query.rows || 6);
  connection.execSql(request); //Execute Query
});

router.get("/:id", async (req, res) => {
  var selectproducts = `SELECT * FROM products WHERE _id = ${req.params.id}`;
  var request = new Request(selectproducts, (err, rowCount, rows) => {
    if (err) res.send(err);
    else {
      if (rowCount == 1) res.send(product);
      else res.status(404).send("Cannot find element " + req.params.id);
    }
  });

  var product = {};
  request.on("row", columns => {
    columns.forEach(column => {
      product[column.metadata.colName] = column.value;
    });
  });

  connection.execSql(request); //Execute Query
});

router.post("/", async (req, res) => {
  var insertProducts = `
  INSERT INTO products (name, description, brand, price, category)
  VALUES ('${req.body.name.replace("'", "''")}', 
  '${req.body.description.replace("'", "''")}', 
  '${req.body.brand.replace("'", "''")}', 
  '${req.body.price}',
  '${req.body.category.replace("'", "''")}'
  )`;

  var request = new Request(insertProducts, err => {
    if (err) res.status(500).send(err);
    else res.send("Item added");
  });
  connection.execSql(request);
});

router.put("/:id", async (req, res) => {
  var updateProducts = `UPDATE products SET `;
  delete req.body._id;
  delete req.body.imageUrl;
  Object.keys(req.body).forEach(
    propName =>
      (updateProducts += `${propName} = '${req.body[propName].replace(
        "'",
        "''"
      )}', `)
  );
  updateProducts += "updatedAt = @date ,";
  updateProducts = updateProducts.substr(0, updateProducts.length - 2);
  updateProducts += ` WHERE _id = ${req.params.id} `;
  var request = new Request(updateProducts, (err, rowCount, rows) => {
    if (err) res.status(500).send(err);
    else res.send("Rows modified " + rowCount);
  });
  request.addParameter("date", Types.DateTime, new Date());
  connection.execSql(request); //Execute Query
});

router.delete("/:id", async (req, res) => {
  var request = new Request(
    "DELETE FROM products WHERE _id = " + req.params.id,
    (err, rowCount) => {
      if (err) res.status(500).send(err);
      else {
        rowCount
          ? res.send("Rows deleted: " + rowCount)
          : res.status(404).send(`ID: ${req.params.id} not found`);
      }
    }
  );
  connection.execSql(request);
});

const upload = multer({});

router.post("/:id/upload", upload.single("prod_picture"), async (req, res) => {
  const fullUrl = req.protocol + "://" + req.get("host") + "/image/";
  const ext = req.file.originalname.split(".").reverse()[0];
  if (ext !== "png" && ext !== "jpg" && ext !== "gif" && ext !== "jpeg") {
    res.status(400).send("only images allowed");
  } else {
    const fileName = req.params.id + "." + ext;
    const path = "./public/imgs/" + fileName;

    const updateQuery = `
    UPDATE products 
    SET imageUrl = '${fullUrl + fileName}' where _id = ${req.params.id}`;
    var request = new Request(updateQuery, (err, rowCount) => {
      if (err) res.status(500).send(err);
      else if (rowCount) {
        fs.writeFile(path, req.file.buffer, err => {
          if (err) throw err;
        });
        res.send("Uploaded");
      } else res.status(400).send("Selected item do not exist");
    });
    connection.execSql(request);
  }
});
/* END OF PRODUCTS ROUTES */

/* REVIEWS ROUTES */
router.post("/:productId/reviews", async (req, res) => {
  var insertReview = `
  INSERT INTO Reviews (author, rate, comment, FK_product)
  VALUES ('${req.body.author.replace("'", "''")}', '${
    typeof req.body.rate == "string" ? parseInt(req.body.rate) : req.body.rate
  }', '${req.body.comment.replace("'", "''")}', 
    '${req.params.productId}')`;
  var request = new Request(insertReview, err => {
    if (err) res.status(500).send(err);
    else res.send("Review added");
  });
  connection.execSql(request);
});

router.get("/:productId/reviews", async (req, res) => {
  /*  SELECT * FROM products 
  ORDER BY _id OFFSET ((@PageNumber - 1) * @RowsPerPage) ROWS
  FETCH NEXT @RowsPerPage ROWS ONLY`; */
  var selectproducts =
    req.params.productId != "-1"
      ? `SELECT * FROM REVIEWS 
         WHERE FK_product = ${req.params.productId} 
         ORDER BY FK_product
         OFFSET ((@PageNumber - 1) * @RowsPerPage) ROWS
         FETCH NEXT @RowsPerPage ROWS ONLY`
      : `SELECT * FROM REVIEWS
         ORDER BY FK_product
         OFFSET ((@PageNumber - 1) * @RowsPerPage) ROWS
         FETCH NEXT @RowsPerPage ROWS ONLY`;
  var request = new Request(selectproducts, (err, rowCount, rows) => {
    if (err) res.status(500).send(err);
    else res.send(reviews);
  });
  var reviews = [];
  request.on("row", columns => {
    var review = {};
    columns.forEach(column => {
      review[column.metadata.colName] = column.value; //add property to the product object
    });
    reviews.push(review);
  });
  request.addParameter("PageNumber", Types.Int, req.query.page || 1);
  request.addParameter("RowsPerPage", Types.Int, req.query.rows || 5);
  connection.execSql(request); //Execute Query
});

router.delete("/:reviewId/reviews", async (req, res) => {
  var request = new Request(
    "DELETE FROM Reviews WHERE _id = " + req.params.reviewId,
    (err, rowCount) => {
      if (err) res.send(err);
      else
        rowCount
          ? res.send("Rows deleted: " + rowCount)
          : res.status(404).send(`ID: ${req.params.id} not found`);
    }
  );
  connection.execSql(request);
});

router.put("/:revId/reviews", async (req, res) => {
  var updateProducts = `UPDATE reviews SET `;
  Object.keys(req.body).forEach(
    propName =>
      (updateProducts += `${propName} = 
      '${req.body[propName].replace("'", "''")}', `)
  );
  updateProducts = updateProducts.substr(0, updateProducts.length - 2);
  updateProducts += ` WHERE _id = ${req.params.revId} `;
  var request = new Request(updateProducts, (err, rowCount, rows) => {
    if (err) res.status(500).send(err);
    else
      rowCount
        ? res.send("Rows modified " + rowCount)
        : res.status(404).send("Not found");
  });
  request.addParameter("date", Types.DateTime, new Date());
  connection.execSql(request); //Execute Query
});

module.exports = router;
