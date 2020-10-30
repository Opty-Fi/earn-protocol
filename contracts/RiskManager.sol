// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./interfaces/opty/IOptyRegistry.sol";
import "./libraries/Addresses.sol";

contract RiskManager {
    
    using Address for address;

    address public optyRegistry;
    address   public governance;


    constructor(address _optyRegistry) public {
        governance = msg.sender;
        optyRegistry = _optyRegistry;
    }

    function setOptyRegistry(address _optyRegistry) public onlyGovernance {
        require(_optyRegistry != address(0),"!_optyRegistry");
        require(_optyRegistry.isContract(),"!_optyRegistry.isContract");
        optyRegistry = _optyRegistry;
    }

    /**
     * @dev Get the best strategy for the Basic/Advance Pool
     * 
     * Returns the hash of the best strategy for Basic or Advance Pool
     * 
     * Requirements:
     * 
     * - `_profile` should be among these values ["basic"/"advance"/"advance+"]
     *      - Can not be empty
     * - `_underlyingTokens` is an array of underlying tokens like dai, usdc and so forth
     *      - Can not have length 0
     * 
     */
    function getBestStrategy(string memory _profile, address[] memory _underlyingTokens) public view returns 
    (bytes32) {
            require(bytes(_profile).length > 0, "empty!");
            for (uint8 i = 0 ; i < _underlyingTokens.length ; i++) {
                require(_underlyingTokens[i] != address(0),"!_underlyingTokens");   
                require(_underlyingTokens[i].isContract(),"!_underlyingTokens");
            }
            bytes32 tokensHash = keccak256(abi.encodePacked(_underlyingTokens));
            if (keccak256(abi.encodePacked((_profile))) == keccak256(abi.encodePacked(("basic")))){
                return _getBestBasicStrategy(tokensHash);
            } else if (keccak256(abi.encodePacked((_profile))) == keccak256(abi.encodePacked(("advance")))){
                return _getBestAdvanceStrategy(tokensHash);
            } else{
                revert("not implemented");
            }
    }
    
    /**
     * @dev Get the best strategy for the Basic Pool which includes T1 and T2 pools
     *      Get the best strategy corresponding to _tokenHash 
     * 
     * Returns the hash of the best strategy for Basic Pool
     * 
     */
    function _getBestBasicStrategy(bytes32 _tokensHash) internal view returns(bytes32){
        bytes32[] memory hashes = IOptyRegistry(optyRegistry).getTokenToStrategies(_tokensHash);
        require(hashes.length > 0,"!hashes.length");
        uint8 maxScore = 0;
        bytes32 bestStrategyHash = hashes[0];
        for(uint8 i = 0; i < hashes.length ; i++) {
            (uint8 score, bool isStrategy,,, IOptyRegistry.StrategyStep[] memory _strategySteps) = 
            IOptyRegistry(optyRegistry).getStrategy(hashes[i]);
            if(
                isStrategy && 
                IOptyRegistry(optyRegistry).liquidityPools(_strategySteps[0].liquidityPool).isLiquidityPool && 
                IOptyRegistry(optyRegistry).liquidityPools(_strategySteps[0].liquidityPool).rating == uint8(0)
            ){
                if(score > maxScore){
                    maxScore = score;
                    bestStrategyHash = hashes[i];
                }
            }
        }
        return bestStrategyHash;
    }
    
    /**
     * @dev Get the best strategy for the Advance Pool which includes T1 and T2 pools
     *      Get the best strategy corresponding to _tokenHash 
     * 
     * Returns the hash of the best strategy for Advance Pool
     * 
     */
    function _getBestAdvanceStrategy (bytes32 _tokensHash) internal view returns(bytes32) {
        bytes32[] memory hashes = IOptyRegistry(optyRegistry).getTokenToStrategies(_tokensHash);
        require(hashes.length > 0, "!hashes.length");
        uint8 maxScore = 0;
        bytes32 bestStrategyHash = hashes[0];
        for(uint8 i = 0; i < hashes.length; i++) {
            (uint8 score, bool isStrategy,,, IOptyRegistry.StrategyStep[] memory _strategySteps) = 
            IOptyRegistry(optyRegistry).getStrategy(hashes[i]);
            
            if ((isStrategy && IOptyRegistry(optyRegistry).liquidityPools(_strategySteps[0].liquidityPool).isLiquidityPool
            && (IOptyRegistry(optyRegistry).creditPools(_strategySteps[0].creditPool).isLiquidityPool
            || IOptyRegistry(optyRegistry).liquidityPools(_strategySteps[0].liquidityPool).rating == uint8(0)))
            || (isStrategy && IOptyRegistry(optyRegistry).liquidityPools(_strategySteps[0].liquidityPool).isLiquidityPool
            && (IOptyRegistry(optyRegistry).creditPools(_strategySteps[0].creditPool).isLiquidityPool
            || IOptyRegistry(optyRegistry).liquidityPools(_strategySteps[0].liquidityPool).rating == uint8(1)))) {
                if (score > maxScore) {
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