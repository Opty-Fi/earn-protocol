const fs = require("fs"); //    library to read/write to a particular file
const compoundLiquidityPools = require("./compoundLiquidityPools"); //  fetching the list of the compound liquidity pool addresses
const aaveLiquidityPools = require("./aaveLiquidityPools"); //  fetching the list of the aave liquidity pool addresses

const creditPool = "0x0000000000000000000000000000000000000000";
const creditPoolProxy = "0x0000000000000000000000000000000000000000";
const borrowToken = "0x0000000000000000000000000000000000000000";
var poolProxy;

data = []; //  store the generated strategies

//  function to write the data(strategies) in a file(SS_NO_CP_strategies.json)
let writeInFile = async (fileName, data) => {
    await fs.writeFile(fileName, JSON.stringify(data), "utf8", function (err) {
        if (err) {
            console.log("An error occured while writing JSON Object to File.");
            return console.log(err);
        }
        console.log(fileName, " file has been saved.");

    });
};

//  function for generating the strategies
let startCreatingStrategies = async () => {

    tmpMap = {};    //  store the temp strategy json
    count = 0;  //  keep track of the number of strategies

    //  Generating the strategies for cToken liquidity pools
    for (var key of Object.keys(compoundLiquidityPools)) {
        if (key.toString() != "optyCompoundPoolProxy") {
            
            tmpMap[count] = [
                creditPool,
                creditPoolProxy,
                borrowToken,
                compoundLiquidityPools[key],
                poolProxy,
            ];
            count++;
        } else {
          poolProxy = compoundLiquidityPools[key];
        }
    }

    //  Generating the strategies for aaveLendingProvider
    for (var key of Object.keys(aaveLiquidityPools)) {
      if (key.toString() != "optyAavePoolProxy") {
          
          tmpMap[count] = [
              creditPool,
              creditPoolProxy,
              borrowToken,
              aaveLiquidityPools[key],
              poolProxy,
          ];
          count++;
      } else {
        poolProxy = aaveLiquidityPools[key];
      }
  }

    data.push(tmpMap);
    //  writing the scraped data  into the file..
    const fileName = "SS_NO_CP_strategies.json";
    // var fileName = process.argv.slice(3)[0] + ".json"
    await writeInFile(fileName, data);
};

startCreatingStrategies(); //  entry point to start the generating the strategies
