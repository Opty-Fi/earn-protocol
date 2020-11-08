const fs = require("fs"); //    library to read/write to a particular file
const compoundLiquidityPools = require("./compoundLiquidityPools"); //  fetching the list of the compound liquidity pool addresses
const aaveLiquidityPools = require("./aaveLiquidityPools"); //  fetching the list of the aave liquidity pool addresses
const borrowTokensList = require("./borrowTokensList");

const creditPool = aaveLiquidityPools["aaveLendingPoolAddressProvider"];
const creditPoolProxy = aaveLiquidityPools["optyAavePoolProxy"];
const poolProxy = compoundLiquidityPools["optyCompoundPoolProxy"];

data = []; //  store the generated strategies

//  function to write the data(strategies) in a file(SS_CP_strategies.json)
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

    //  Generating the strategies corresponding to all the borrow tokens 
    //  Note: Considering AAVE as CP and  COMPOUND as liquidity pool
    for (var borrowTokenKey of Object.keys(borrowTokensList)) {
        
        tmpMap[count] = [
            creditPool,
            creditPoolProxy,
            borrowTokensList[borrowTokenKey],
            compoundLiquidityPools[
                Object.keys(
                    compoundLiquidityPools
                ).filter((compoundLiquidityPoolsKey) =>
                    compoundLiquidityPoolsKey.substring(1) === borrowTokenKey
                )
            ],
            poolProxy,
        ];
        count++;
    }

    data.push(tmpMap);
    //  writing the scraped data  into the file..
    const fileName = "SS_CP_strategies.json";
    // var fileName = process.argv.slice(3)[0] + ".json"
    await writeInFile(fileName, data);
};

startCreatingStrategies(); //  entry point to start the generating the strategies
