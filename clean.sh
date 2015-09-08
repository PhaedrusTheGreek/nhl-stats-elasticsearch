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
                    },
                     "revlocation" : {
                        "type" : "geo_point"
                    }
                },
               "dynamic_templates" :[{
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



