const elastic = require("./elastic")

const router = require("express").Router();

router.post("/add-clb", elastic.addElasticCLB);
router.post("/add-animal", elastic.addElasticAnimal);
router.post("/add-nhom-two", elastic.addElasticNhom2);
router.post("/add-nhom4", elastic.addElasticnhom4);
router.post("/add-knd", elastic.addElasticKND);
router.post("/add-ot3", elastic.addElasticOT3);
router.post("/add-dma", elastic.addElasticDMA);
router.post("/add-thk", elastic.addElasticTHK);
router.post("/add-sol3", elastic.addElasticSOL3);
router.post("/add-nhom5", elastic.addElasticnhom5);
router.post("/add-nhom7", elastic.addElasticnhom7);
router.post("/add-acv1", elastic.addElasticnhomacv1);
router.post("/add-nhom11", elastic.addElasticnhom11);
router.delete("/delete-elastic", elastic.deleteIndex);
router.post("/create-index", elastic.createIndex);
router.get("/get-all-elastic", elastic.getAllData);
router.post("/search", elastic.search);

module.exports = router;