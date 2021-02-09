// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import "./Registry.sol";
import "./libraries/Addresses.sol";
import "./utils/Modifiers.sol";

contract RiskManager is Modifiers {
    
    using Address for address;
    string public constant BASIC = "basic";
    string public constant ADVANCE = "advance";
    string public constant ADVANCEPLUS = "advanceplus";
    uint public T1_limit;
    uint public T2_limit;
    uint public T3_limit;

    constructor(address _registry) public Modifiers(_registry) {
    }
    
    /**
     * @dev Set limit values for T1, T2 and T3 ranges  
     * 
     * Returns the hash of the best strategy for Basic Pool
     * 
     */
    function setLimits(uint _T1_limit, uint _T2_limit, uint _T3_limit) public onlyGovernance returns(bool) {
        require(_T1_limit > _T2_limit && _T2_limit > _T3_limit && _T3_limit > uint(0), "Invalid values for score limits.");
        T1_limit = _T1_limit;
        T2_limit = _T2_limit;
        T3_limit = _T3_limit;
        return true;
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
            if (keccak256(abi.encodePacked((_profile))) == keccak256(abi.encodePacked((BASIC)))){
                return _getBestBasicStrategy(tokensHash);
            } else if (keccak256(abi.encodePacked((_profile))) == keccak256(abi.encodePacked((ADVANCE)))){
                return _getBestAdvanceStrategy(tokensHash);
            } else if (keccak256(abi.encodePacked((_profile))) == keccak256(abi.encodePacked((ADVANCEPLUS)))){
                return _getBestAdvancePlusStrategy(tokensHash);
            } else {
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
    function _getBestBasicStrategy(bytes32 _tokensHash) internal view returns(bytes32) {
        bytes32[] memory hashes = registryContract.getTokenToStrategies(_tokensHash);
        require(hashes.length > 0,"!hashes.length");
        uint8 maxScore = 0;
        bytes32 bestStrategyHash = 0x0000000000000000000000000000000000000000000000000000000000000000;
        for(uint8 i = 0; i < hashes.length ; i++) {
            (uint8 score, bool isStrategy,,,StrategyStep[] memory _strategySteps) = 
            registryContract.getStrategy(hashes[i]);
            if(
                isStrategy && 
                !_strategySteps[0].isBorrow &&
                registryContract.getLiquidityPool(_strategySteps[0].pool).isLiquidityPool && 
                registryContract.getLiquidityPool(_strategySteps[0].pool).rating >= T1_limit
            ){
                if(score > maxScore){
                    maxScore = score;
                    bestStrategyHash = hashes[i];
                }
            }
        }
        require(bestStrategyHash != 0x0000000000000000000000000000000000000000000000000000000000000000,"!bestStrategyHash");
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
        bytes32[] memory hashes = registryContract.getTokenToStrategies(_tokensHash);
        require(hashes.length > 0, "!hashes.length");
        uint8 maxScore = 0;
        bytes32 bestStrategyHash = 0x0000000000000000000000000000000000000000000000000000000000000000;
        for(uint8 i = 0; i < hashes.length; i++) {
            (uint8 score, bool isStrategy,,,StrategyStep[] memory _strategySteps) = 
            registryContract.getStrategy(hashes[i]);
            if(isStrategy) {
                if((_strategySteps[0].isBorrow && registryContract.getCreditPool(_strategySteps[0].pool).isLiquidityPool 
                && registryContract.getCreditPool(_strategySteps[0].pool).rating >= T2_limit 
                ) || 
                (!_strategySteps[0].isBorrow && registryContract.getLiquidityPool(_strategySteps[0].pool).isLiquidityPool 
                && (
                    registryContract.getCreditPool(_strategySteps[0].pool).rating >= T2_limit
                    )
                )) {
                    if (score > maxScore) {
                    maxScore = score;
                    bestStrategyHash = hashes[i];
                    }
                }
            }
        }
        require(bestStrategyHash != 0x0000000000000000000000000000000000000000000000000000000000000000,"!bestStrategyHash");
        return bestStrategyHash;
    }
    
    /**
     * @dev Get the best strategy for the Advance plus Pool which includes T1, T2 and T3 pools
     *      Get the best strategy corresponding to _tokenHash 
     * 
     * Returns the hash of the best strategy for Advance Plus Pool
     * 
     */
    function _getBestAdvancePlusStrategy (bytes32 _tokensHash) internal view returns(bytes32) {
        bytes32[] memory hashes = registryContract.getTokenToStrategies(_tokensHash);
        require(hashes.length > 0, "!hashes.length");
        uint8 maxScore = 0;
        bytes32 bestStrategyHash = 0x0000000000000000000000000000000000000000000000000000000000000000;
        for(uint8 i = 0; i < hashes.length; i++) {
            (uint8 score, bool isStrategy,,,StrategyStep[] memory _strategySteps) = 
            registryContract.getStrategy(hashes[i]);
            if(isStrategy) {
                if((_strategySteps[0].isBorrow && registryContract.getCreditPool(_strategySteps[0].pool).isLiquidityPool 
                && registryContract.getCreditPool(_strategySteps[0].pool).rating >= T3_limit 
                ) || 
                (!_strategySteps[0].isBorrow && registryContract.getLiquidityPool(_strategySteps[0].pool).isLiquidityPool 
                && (
                    registryContract.getCreditPool(_strategySteps[0].pool).rating >= T3_limit
                    )
                )) {
                    if (score > maxScore) {
                    maxScore = score;
                    bestStrategyHash = hashes[i];
                    }
                }
            }
        }
        require(bestStrategyHash != 0x0000000000000000000000000000000000000000000000000000000000000000,"!bestStrategyHash");
        return bestStrategyHash;
    }
} 