const ES = require("@elastic/elasticsearch");

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
                replace_a: {
                  type: "pattern_replace",
                  pattern: "[àáạảãâầấậẩẫăằắặẳẵ]",
                  replacement: "a"
                },
                replace_e: {
                  type: "pattern_replace",
                  pattern: "[èéẹẻẽêềếệểễ]",
                  replacement: "e"
                },
                replace_i: {
                  type: "pattern_replace",
                  pattern: "[ìíịỉĩ]",
                  replacement: "i"
                },
                replace_o: {
                  type: "pattern_replace",
                  pattern: "[òóọỏõôồốộổỗơờớợởỡ]",
                  replacement: "o"
                },
                replace_u: {
                  type: "pattern_replace",
                  pattern: "[ùúụủũưừứựửữ]",
                  replacement: "u"
                },
                replace_y: {
                  type: "pattern_replace",
                  pattern: "[ỳýỵỷỹ]",
                  replacement: "y"
                },
                replace_d: {
                  type: "pattern_replace",
                  pattern: "[đ]",
                  replacement: "d"
                }
              },
              filter: {
                shingle_filter: {
                  type: "shingle",
                  min_shingle_size: 2,
                  max_shingle_size: 2,
                  output_unigrams: false
                }
              },
              analyzer: {
                origin_viet_analyzer: {
                  type: "custom",
                  tokenizer: "whitespace",
                  filter: ["lowercase", "shingle_filter"]
                },
                non_viet_analyzer: {
                  type: "custom",
                  char_filter: [
                    "replace_a",
                    "replace_e",
                    "replace_i",
                    "replace_o",
                    "replace_u",
                    "replace_y",
                    "replace_d"
                  ],
                  tokenizer: "whitespace",
                  filter: ["lowercase", "shingle_filter"]
                }
              }
            },
            similarity: {
              lnc_ltc_similarity: {
                type: "scripted",
                script: {
                  source: " double docTf = (doc.freq > 0) ? 1 + Math.log(doc.freq) : 0; double docNorm = (doc.length > 0) ? 1 / Math.sqrt(doc.length) : 1;double queryTf = (term.totalTermFreq > 0) ? 1 + Math.log(term.totalTermFreq) : 0; double idf = (term.docFreq > 0) ? Math.log((field.docCount + 1.0) / term.docFreq) : 0; double queryNorm = 1 / Math.sqrt(field.sumDocFreq > 0 ? field.sumDocFreq : 1); return docTf*docNorm*queryTf*idf*queryNorm"
                }
              }
            }
          },
          mappings: {
            properties: {
              description: {
                type: "text",
                fields: {
                  origin_viet: {
                    type: "text",
                    analyzer: "origin_viet_analyzer",
                    term_vector: "with_positions_offsets"
                  },
                  non_viet: {
                    type: "text",
                    analyzer: "non_viet_analyzer",
                    term_vector: "with_positions_offsets"
                  }
                },
                similarity: "lnc_ltc_similarity"
              },
              content: {
                type: "text",
                fields: {
                  origin_viet: {
                    type: "text",
                    analyzer: "origin_viet_analyzer",
                    term_vector: "with_positions_offsets"
                  },
                  non_viet: {
                    type: "text",
                    analyzer: "non_viet_analyzer",
                    term_vector: "with_positions_offsets"
                  }
                }
              }
            }
          }
        }
      });
      console.log("Index 'news' created successfully");
      return res.status(200).json({
        statusCode: 200,
        message: 'Index created successfully',
      });

    } else {
      console.log("Index 'news' already exists");
      return res.status(200).json({
        statusCode: 200,
        message: 'Index already exists',
      });
    }
  } catch (err) {
    console.log("Error creating index", err);
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
    });
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


// doc file dataCLB.json




const addElasticCLB = async (req,res) => {
  try {
    const documents = require("./dataCLB.json");
    if (documents.length === 0) {
      return res.status(400).json({ message: 'Data is empty' });
    }
    const data = documents.filter((doc, index, self) =>
            index === self.findIndex((t) =>
                t.title === doc.title && t.description === doc.description && t.date === doc.date
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
            description: item.description,
            date: item.date,
            link: item.link,
            content: item.paragram
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
        query: { // Wrap `multi_match` inside `query`
          multi_match: {
            query: text,
            fields: ["description", "content"], // Fields to search in
          },
        },
      },
      size: 10, // Limit the number of results
    });
    const mapData = result.hits.hits.map((item) =>{
      return {
        _score: item._score,
        title: item._source.title,
        description: item._source.description,
        date: item._source.date,
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



module.exports = {esClient,createIndex,deleteIndex, addElasticCLB, getAllData, search ,deleteDocument };

