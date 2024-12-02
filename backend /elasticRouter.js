const elastic = require("./elastic")

const router = require("express").Router();

router.post("/add-elastic", elastic.addElasticCLB);
router.delete("/delete-elastic", elastic.deleteIndex);
router.post("/create-index", elastic.createIndex);
router.get("/get-all-elastic", elastic.getAllData);
router.post("/search", elastic.search);

module.exports = router;