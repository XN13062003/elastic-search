const ES = require("@elastic/elasticsearch");
const fs = require('fs');

const elasticConfig = {
  ip: process.env.ELASTIC_HOST || "localhost",
  port: process.env.ELASTIC_PORT || 9200,
  user: process.env.ELASTIC_USER || "elastic",
  pass: process.env.ELASTIC_PASSWORD || "changeme",
};

const esClient = new ES.Client({
  node: `http://${elasticConfig.ip}:${elasticConfig.port}`,
  auth: {
    username: elasticConfig.user,
    password: elasticConfig.pass,
  },
});

esClient.ping()
  .then(() => {
    console.log("Elasticsearch is connected");
  })
  .catch((err) => {
    console.log("Elasticsearch is not connected", err);
  });

const deleteIndex = async () => {
  try {
    const indexExists = await esClient.indices.exists({ index: "news" });
    if (indexExists) {
      await esClient.indices.delete({ index: "news" });
      console.log("Index 'products' deleted successfully");
    } else {
      console.log("Index 'products' does not exist");
    }
  } catch (err) {
    console.log("Error deleting index", err);
  }
}

const createIndex = async (req, res) => {
  try {
    const indexExists = await esClient.indices.exists({ index: "news" });
    if (!indexExists) {
      await esClient.indices.create({
        index: "news",
        body: {
          settings: {
            analysis: {
              char_filter: {
                replace_a: { type: "pattern_replace", pattern: "[àáạảãâầấậẩẫăằắặẳẵ]", replacement: "a" },
                replace_e: { type: "pattern_replace", pattern: "[èéẹẻẽêềếệểễ]", replacement: "e" },
                replace_i: { type: "pattern_replace", pattern: "[ìíịỉĩ]", replacement: "i" },
                replace_o: { type: "pattern_replace", pattern: "[òóọỏõôồốộổỗơờớợởỡ]", replacement: "o" },
                replace_u: { type: "pattern_replace", pattern: "[ùúụủũưừứựửữ]", replacement: "u" },
                replace_y: { type: "pattern_replace", pattern: "[ỳýỵỷỹ]", replacement: "y" },
                replace_d: { type: "pattern_replace", pattern: "[đ]", replacement: "d" }
              },
              filter: {
                my_stop: { type: "stop", stopwords: ["và", "là", "của", "các", "một", "những", "với", "được", "trong"] },
                shingle_filter: { type: "shingle", min_shingle_size: 2, max_shingle_size: 2, output_unigrams: false },
                my_bigram_filter: { type: "shingle", min_shingle_size: 2, max_shingle_size: 2, output_unigrams: false },
                my_trigram_filter: { type: "shingle", min_shingle_size: 3, max_shingle_size: 3, output_unigrams: false },
                remove_special_characters_filter: { type: "pattern_replace", pattern: "[\\n\\r]+", replacement: " " },
                punctuation_removal: { type: "pattern_replace", pattern: "[\\p{Punct}]", replacement: " " }
              },
              analyzer: {
                origin_viet_analyzer: { type: "custom", tokenizer: "whitespace", filter: ["lowercase", "shingle_filter"] },
                non_viet_analyzer: {
                  type: "custom",
                  char_filter: ["replace_a", "replace_e", "replace_i", "replace_o", "replace_u", "replace_y", "replace_d"],
                  tokenizer: "whitespace",
                  filter: ["lowercase", "shingle_filter"]
                },
                my_analyzer: {
                  type: "custom",
                  tokenizer: "standard",
                  filter: ["lowercase", "my_stop", "remove_special_characters_filter", "punctuation_removal"]
                },
                my_bigram_analyzer: {
                  type: "custom",
                  tokenizer: "whitespace",
                  filter: ["lowercase", "my_stop", "remove_special_characters_filter", "punctuation_removal", "my_bigram_filter"]
                },
                my_trigram_analyzer: {
                  type: "custom",
                  tokenizer: "whitespace",
                  filter: ["lowercase", "my_stop", "remove_special_characters_filter", "punctuation_removal", "my_trigram_filter"]
                }
              }
            },
            similarity: {
              my_bm25: { type: "BM25", k1: 1.2, b: 0.75 },
              lnc_ltc_similarity: {
                type: "scripted",
                script: {
                  source: `
                    double docTf = (doc.freq > 0) ? 1 + Math.log(doc.freq) : 0;
                    double docNorm = (doc.length > 0) ? 1 / Math.sqrt(doc.length) : 1;
                    double queryTf = (term.totalTermFreq > 0) ? 1 + Math.log(term.totalTermFreq) : 0;
                    double idf = (term.docFreq > 0) ? Math.log((field.docCount + 1.0) / term.docFreq) : 0;
                    double queryNorm = 1 / Math.sqrt(field.sumDocFreq > 0 ? field.sumDocFreq : 1);
                    return docTf * docNorm * queryTf * idf * queryNorm;
                  `
                }
              }
            }
          },
          mappings: {
            properties: {
              title: {
                type: "text",
                fields: {
                  origin_viet: { type: "text", analyzer: "origin_viet_analyzer" },
                  non_viet: { type: "text", analyzer: "non_viet_analyzer" },
                  bigrams: { type: "text", analyzer: "my_bigram_analyzer" },
                  trigrams: { type: "text", analyzer: "my_trigram_analyzer" }
                },
                similarity: "my_bm25"
              },
              content: {
                type: "text",
                fields: {
                  origin_viet: { type: "text", analyzer: "origin_viet_analyzer" },
                  non_viet: { type: "text", analyzer: "non_viet_analyzer" },
                  bigrams: { type: "text", analyzer: "my_bigram_analyzer" },
                  trigrams: { type: "text", analyzer: "my_trigram_analyzer" }
                },
                similarity: "lnc_ltc_similarity"
              }
            }
          }
        }
      });
      console.log("Index 'news' created successfully");
      return res.status(200).json({ statusCode: 200, message: "Index created successfully" });
    } else {
      console.log("Index 'news' already exists");
      return res.status(200).json({ statusCode: 200, message: "Index already exists" });
    }
  } catch (err) {
    console.log("Error creating index", err);
    return res.status(500).json({ statusCode: 500, message: "Internal Server Error" });
  }
};


const getAllData = async (req, res) => {
  try {
    const data = await esClient.search({
      index: 'news',
      size: 10000,
      body: {
        query: {
          match_all: {},
        },
      },
    });

    const count = await esClient.count({
      index: 'news',
      body: {
        query: {
          match_all: {},
        },
      },
    });

    console.log(`Total count of documents: ${count.count}`);

    return res.status(200).json({
      statusCode: 200,
      message: 'Data fetched successfully',
      data: data.hits.hits,
    });
  } catch (e) {
    console.error('Error fetching data:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};


const addElasticnhom11 = async (req,res) => {
  try {
    const documents = require("./dataAll/NHOM11.json");
    if (documents.length === 0) {
      return res.status(400).json({ message: 'Data is empty' });
    }
    const data = documents.filter((doc, index, self) =>
        index === self.findIndex((t) =>
          t.title === doc.title
        )
    );

    const batchSize = 2;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        await esClient.index({
          index: 'news',
          body: {
            title: item.title,
            link: item.link,
            content: item.content
          },
        });
      });
      await Promise.allSettled(promises);
    }
    return res.status(200).json({
      statusCode: 200,
      message: 'Data added successfully',
    });

  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

const addElasticnhomacv1 = async (req,res) => {
  try {
    const documents = require("./dataAll/ACV1.json");
    if (documents.length === 0) {
      return res.status(400).json({ message: 'Data is empty' });
    }
    const data = documents.filter((doc, index, self) =>
        index === self.findIndex((t) =>
          t.title === doc.title
        )
    );

    const batchSize = 2;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        await esClient.index({
          index: 'news',
          body: {
            title: item.title,
            link: item.link,
            content: item.content
          },
        });
      });
      await Promise.allSettled(promises);
    }
    return res.status(200).json({
      statusCode: 200,
      message: 'Data added successfully',
    });

  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

const addElasticnhom7 = async (req,res) => {
  try {
    const documents = require("./dataAll/NHOM7.json");
    if (documents.length === 0) {
      return res.status(400).json({ message: 'Data is empty' });
    }
    const data = documents.filter((doc, index, self) =>
        index === self.findIndex((t) =>
          t.title === doc.title
        )
    );

    const batchSize = 2;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        await esClient.index({
          index: 'news',
          body: {
            title: item.title,
            link: item.link,
            content: item.content
          },
        });
      });
      await Promise.allSettled(promises);
    }
    return res.status(200).json({
      statusCode: 200,
      message: 'Data added successfully',
    });

  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

const addElasticnhom5 = async (req,res) => {
  try {
    const documents = require("./dataAll/NHOM5.json");
    if (documents.length === 0) {
      return res.status(400).json({ message: 'Data is empty' });
    }
    const data = documents.filter((doc, index, self) =>
        index === self.findIndex((t) =>
          t.title === doc.title
        )
    );

    const batchSize = 2;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        await esClient.index({
          index: 'news',
          body: {
            title: item.title,
            link: item.link,
            content: item.content
          },
        });
      });
      await Promise.allSettled(promises);
    }
    return res.status(200).json({
      statusCode: 200,
      message: 'Data added successfully',
    });

  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

const addElasticTHK = async (req,res) => {
  try {
    const documents = require("./dataAll/BK-THK.json");
    if (documents.length === 0) {
      return res.status(400).json({ message: 'Data is empty' });
    }
    const data = documents.filter((doc, index, self) =>
        index === self.findIndex((t) =>
          t.title === doc.title
        )
    );

    const batchSize = 2;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        await esClient.index({
          index: 'news',
          body: {
            title: item.title,
            link: item.link,
            content: item.content
          },
        });
      });
      await Promise.allSettled(promises);
    }
    return res.status(200).json({
      statusCode: 200,
      message: 'Data added successfully',
    });

  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

const addElasticSOL3 = async (req,res) => {
  try {
    const documents = require("./dataAll/SOL3.json");
    if (documents.length === 0) {
      return res.status(400).json({ message: 'Data is empty' });
    }
    const data = documents.filter((doc, index, self) =>
        index === self.findIndex((t) =>
          t.title === doc.title
        )
    );

    const batchSize = 2;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        await esClient.index({
          index: 'news',
          body: {
            title: item.title,
            link: item.link,
            content: item.content
          },
        });
      });
      await Promise.allSettled(promises);
    }
    return res.status(200).json({
      statusCode: 200,
      message: 'Data added successfully',
    });

  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

const addElasticDMA = async (req,res) => {
  try {
    const documents = require("./dataAll/DMA.json");
    if (documents.length === 0) {
      return res.status(400).json({ message: 'Data is empty' });
    }
    const data = documents.filter((doc, index, self) =>
        index === self.findIndex((t) =>
          t.title === doc.title
        )
    );

    const batchSize = 2;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        await esClient.index({
          index: 'news',
          body: {
            title: item.title,
            link: item.link,
            content: item.content
          },
        });
      });
      await Promise.allSettled(promises);
    }
    return res.status(200).json({
      statusCode: 200,
      message: 'Data added successfully',
    });

  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

const addElasticOT3 = async (req,res) => {
  try {
    const documents = require("./dataAll/OT3.json");
    if (documents.length === 0) {
      return res.status(400).json({ message: 'Data is empty' });
    }
    const data = documents.filter((doc, index, self) =>
        index === self.findIndex((t) =>
          t.title === doc.title
        )
    );

    const batchSize = 2;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        await esClient.index({
          index: 'news',
          body: {
            title: item.title,
            link: item.link,
            content: item.content
          },
        });
      });
      await Promise.allSettled(promises);
    }
    return res.status(200).json({
      statusCode: 200,
      message: 'Data added successfully',
    });

  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

const addElasticKND = async (req,res) => {
  try {
    const documents = require("./dataAll/KND.json");
    if (documents.length === 0) {
      return res.status(400).json({ message: 'Data is empty' });
    }
    const data = documents.filter((doc, index, self) =>
        index === self.findIndex((t) =>
          t.title === doc.title
        )
    );

    const batchSize = 2;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        await esClient.index({
          index: 'news',
          body: {
            title: item.title,
            link: item.link,
            content: item.content
          },
        });
      });
      await Promise.allSettled(promises);
    }
    return res.status(200).json({
      statusCode: 200,
      message: 'Data added successfully',
    });

  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

const addElasticNhom2 = async (req,res) => {
  try {
    const documents = require("./dataAll/NHOM2.json");
    if (documents.length === 0) {
      return res.status(400).json({ message: 'Data is empty' });
    }
    const data = documents.filter((doc, index, self) =>
        index === self.findIndex((t) =>
          t.title === doc.title
        )
    );

    const batchSize = 2;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        await esClient.index({
          index: 'news',
          body: {
            title: item.title,
            link: item.link,
            content: item.content
          },
        });
      });
      await Promise.allSettled(promises);
    }
    return res.status(200).json({
      statusCode: 200,
      message: 'Data added successfully',
    });

  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

const addElasticAnimal = async (req,res) => {
  try {
    const documents = require("./dataAll/PHM.json");
    if (documents.length === 0) {
      return res.status(400).json({ message: 'Data is empty' });
    }
    const data = documents.filter((doc, index, self) =>
        index === self.findIndex((t) =>
          t.title === doc.title
        )
    );

    const batchSize = 2;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        await esClient.index({
          index: 'news',
          body: {
            title: item.title,
            link: item.link,
            content: item.content
          },
        });
      });
      await Promise.allSettled(promises);
    }
    return res.status(200).json({
      statusCode: 200,
      message: 'Data added successfully',
    });

  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};


const addElasticnhom4 = async (req,res) => {
  try {
    const documents = require("./dataAll/NHOM4.json");
    if (documents.length === 0) {
      return res.status(400).json({ message: 'Data is empty' });
    }
    const data = documents.filter((doc, index, self) =>
        index === self.findIndex((t) =>
          t.title === doc.title
        )
    );

    const batchSize = 2;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        await esClient.index({
          index: 'news',
          body: {
            title: item.title,
            link: item.link,
            content: item.content
          },
        });
      });
      await Promise.allSettled(promises);
    }
    return res.status(200).json({
      statusCode: 200,
      message: 'Data added successfully',
    });

  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};


const addElasticCLB = async (req,res) => {
  try {
    const documents = require("./dataALL/data.json");
    if (documents.length === 0) {
      return res.status(400).json({ message: 'Data is empty' });
    }
    console.log("documents",documents.length)
    const data = documents.filter((doc, index, self) =>
        index === self.findIndex((t) =>
          t.title === doc.title
        )
    );
    const batchSize = 2;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        await esClient.index({
          index: 'news',
          body: {
            title: item.title,
            link: item.link,
            content: item.content
          },
        });
      });
      await Promise.allSettled(promises);
    }
    return res.status(200).json({
      statusCode: 200,
      message: 'Data added successfully',
    });

  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

const deleteDocument = async (id) => {
  try {
    const documentExists = await esClient.exists({
      index: 'news',
      id: id,
    });

    if (documentExists) {
      await esClient.delete({
        index: 'news',
        id: id,
      });
      console.log(`Document with id ${id} deleted successfully.`);
    } else {
      console.log(`Document with id ${id} not found.`);
    }
  } catch (e) {
    console.error(e);
  }
};

const search = async (req, res) => {
  try {
    const { text } = req.body; // Extract search text from request body
    console.log(text);

    const result = await esClient.search({
      index: "news",
      body: {
        query: {
          multi_match: {
            query: text,
            fields: [
              "content^2",     // Ưu tiên trung bình cho 'content'
              "title"          // Ưu tiên thấp nhất cho 'title'
            ],
          },
        },
      },
      size: 10, // Giới hạn số kết quả
    });
    const mapData = result.hits.hits.map((item) =>{
      return {
        _score: item._score,
        title: item._source.title,
        link: item._source.link,
        content: item._source.content
      }

    });

    return res.status(200).json({
      statusCode: 200,
      message: 'Data fetched successfully',
      data: mapData, // Return only the hits
    });
  } catch (e) {
    console.error('Error:', e);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
  }
};

const now = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0'); // Lấy ngày, thêm 0 nếu cần
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0, nên +1
  const year = now.getFullYear();

  return `${day}/${month}/${year}`; // Trả về theo định dạng DD/MM/YYYY
};

const addData = async (documents) => {
  try {
    const data = documents.filter((doc, index, self) =>
        index === self.findIndex((t) =>
          t.title === doc.title && t.description === doc.description && t.date === doc.date
        )
    );
    const batchSize = 2;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {

        if(item.date.slice(0,10).toString() === now().toString()){
          await esClient.index({
            index: 'news',
            body: {
              title: item.title,
              link: item.link,
              content: item.content
            },
          });
        }
      });
      await Promise.allSettled(promises);
    }
    console.log('Data added successfully');
    return true
  } catch (e) {
    console.error('Error:', e);
    return false
  }
}



module.exports = {addData,esClient,createIndex,addElasticnhom4,deleteIndex, addElasticCLB, getAllData, search ,deleteDocument ,addElasticAnimal,addElasticNhom2,addElasticKND,addElasticOT3,addElasticDMA,addElasticTHK,addElasticSOL3,addElasticnhom5,addElasticnhom7,addElasticnhom11,addElasticnhomacv1 };