export type cmdType = {
    symbol: string;
    strategyName: string;
    testAmount: number;
    strategiesCount: number;
    insertGasRecordsInDB: boolean;
    writeGasRecordsInFile: boolean;
    runTimeVersion: string;
    codeProvider: string;
};

export type allStrategiesGasUsedRecordsType = {
    testScriptRunDateAndTime: number;
    strategyRunDateAndTime: number;
    strategyName: string;
    setStrategy: number;
    scoreStrategy: number;
    setAndScoreStrategy: number;
    userDepositRebalanceTx: number;
    userWithdrawRebalanceTx: number;
};
