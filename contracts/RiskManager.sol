// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

interface IOptyRegistry{
    struct StrategyStep {
        address token; 
        address creditPool; 
        address borrowToken; 
        address liquidityPool; 
        address strategyContract;
        address lendingPoolToken;
        address poolProxy;
    }

    struct Strategy { 
        uint8          score;
        bool           isStrategy;
        uint256        index;
        uint256        blockNumber;
        StrategyStep[] strategySteps;
    }

    function tokenToStrategies(address _underLyingToken, uint256 index) external view returns(bytes32);
    function getStrategy(bytes32 _hash) external view returns(uint8 _score, bool _isStrategy, uint256 _index, uint256 _blockNumber, StrategyStep[] memory _strategySteps);
}

contract RiskManager {

    address public optyRegistry;
    address   public governance;


    constructor(address _optyRegistry) public {
        governance = msg.sender;
        optyRegistry = _optyRegistry;
    }

    function setOptyRegistry(address _optyRegistry) public onlyGovernance {
        optyRegistry = _optyRegistry;
    }

    function getBestStrategy(string memory _profile, address _underlyingToken) public view returns 
    (IOptyRegistry.Strategy memory strategy) {
        require(bytes(_profile).length > 0, "empty!");
        bytes32 hash = IOptyRegistry(optyRegistry).tokenToStrategies(_underlyingToken,0);
        // logic to get best strategy
        (uint8 score, bool isStrategy, uint256 index, uint256 blockNumber,IOptyRegistry.StrategyStep[] memory strategySteps) = 
        IOptyRegistry(optyRegistry).getStrategy(hash);
        
        strategy = IOptyRegistry.Strategy(score, isStrategy, index, blockNumber, strategySteps);
    }

    /**
     * @dev Modifier to check caller is governance or not
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "!governance");
        _;
    }
} 