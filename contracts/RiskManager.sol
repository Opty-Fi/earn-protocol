// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

interface IOptyRegistry{
    struct LiquidityPool{
        uint8 rating;
        bool  isLiquidityPool;
    }
    
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
    function getTokenStrategies(address _token) external view returns(bytes32[] memory);
    function liquidityPools(address _pool) external view returns(LiquidityPool memory);
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
    (bytes32) {
            require(bytes(_profile).length > 0, "empty!");
            if (keccak256(abi.encodePacked((_profile))) == keccak256(abi.encodePacked(("basic")))){
                return getBestBasicStrategy(_underlyingToken);
            }
            else{
                revert("not implemented");
            }
    }
    
    function getBestBasicStrategy(address _underlyingToken) public view returns(bytes32){
        require(_underlyingToken != address(0),"!zero");
        bytes32[] memory hashes = IOptyRegistry(optyRegistry).getTokenStrategies(_underlyingToken);
        require(hashes.length > 0,"!hashes.length");
        uint8 maxScore = 0;
        bytes32 bestStrategyHash = hashes[0];
        for(uint8 i = 0; i < hashes.length ; i++) {
            (uint8 score, bool isStrategy,,, IOptyRegistry.StrategyStep[] memory _strategySteps) = 
            IOptyRegistry(optyRegistry).getStrategy(hashes[i]);
            if(isStrategy && IOptyRegistry(optyRegistry).liquidityPools(_strategySteps[0].liquidityPool).isLiquidityPool
            && IOptyRegistry(optyRegistry).liquidityPools(_strategySteps[0].liquidityPool).rating == uint8(0)){
                if(score > maxScore){
                    maxScore = score;
                    bestStrategyHash = hashes[i];
                }
            }
        }
        return bestStrategyHash;
    }

    /**
     * @dev Modifier to check caller is governance or not
     */
    modifier onlyGovernance() {
        require(msg.sender == governance, "!governance");
        _;
    }
} 