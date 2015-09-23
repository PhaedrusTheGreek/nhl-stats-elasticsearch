#!/usr/bin/env bash
curl -XDELETE localhost:9200/nhl
curl -XPOST localhost:9200/nhl -d '{
   "mappings" :
      {
         "play" :
            {
                "properties" : {
                    "location" : {
                        "type" : "geo_point"
                    }

                },
               "dynamic_templates" :[{
                        "season_roster_detail" :
                        {
                            "match" : "*_detail",
                             "mapping" :{
                                    "type" : "nested",
                                    "properties" : {
                                        "GP": { "type": "integer" },
                                        "G": { "type": "integer" },
                                        "A": { "type": "integer" },
                                        "P": { "type": "integer" },
                                        "+/-": { "type": "integer" },
                                        "PIM": { "type": "integer" },
                                        "S": { "type": "integer" },
                                        "G": { "type": "integer" },
                                        "PP": { "type": "integer" },
                                        "SH": { "type": "integer" },
                                        "GWG": { "type": "integer" },
                                        "OT": { "type": "integer" }
                                    }

                                 }
                        }},
                        {
                        "notanalyzed" :
                           {
                              "match" : "*",
                              "match_mapping_type" : "string",
                              "mapping" :{
                                    "type" : "string",
                                    "index" : "analyzed",
                                    "omit_norms" : true,
                                    "fields" :{
                                          "raw" :{
                                                "type" : "string",
                                                "index" : "not_analyzed"
                                             }
                                       }
                                 }
                           }


                     }
                  ]
            }
      }
}'



