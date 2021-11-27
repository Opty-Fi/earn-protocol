// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

//  libraries
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

//  helper contracts
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { Modifiers } from "./Modifiers.sol";

//  interfaces
import { IAaveV1LendingPoolAddressesProvider } from "../../interfaces/aave/v1/IAaveV1LendingPoolAddressesProvider.sol";
import { IAaveV1LendingPoolCore } from "../../interfaces/aave/v1/IAaveV1LendingPoolCore.sol";
import { ReserveDataV2, IAaveV2 } from "../../interfaces/aave/v2/IAaveV2.sol";
import { IAaveV2LendingPoolAddressesProvider } from "../../interfaces/aave/v2/IAaveV2LendingPoolAddressesProvider.sol";
import { ICompound } from "../../interfaces/compound/ICompound.sol";
import { Constants } from "../../utils/Constants.sol";
import { IAPROracle } from "../../interfaces/opty/IAPROracle.sol";
import { ReserveDataV1, IAaveV1 } from "../../interfaces/aave/v1/IAaveV1.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title APROracle contract
 * @author Opty.fi inspired on yearn.finance APROracle contract
 * @notice Contract for getting APR from Aave and compound protocols
 * @dev Contract contains math for getting best APR among Aave and Compound
 */
contract APROracle is IAPROracle, Modifiers {
    using SafeMath for uint256;
    using Address for address;

    /** @notice Store AaveV1 LendingPoolProvider address */
    address public aaveV1;

    /** @notice Store AaveV2 LendingPoolProvider address */
    address public aaveV2;

    /** @notice Store Compound address */
    address public compound;

    /** @notice Stores the estimation of no. of blocks gets mined per year */
    uint256 public blocksPerYear;

    /** @notice underlying token to cToken mapping */
    mapping(address => address) public cTokens;

    constructor(address _registry) public Modifiers(_registry) {
        setNewAaveV1(address(0x24a42fD28C976A61Df5D00D0599C34c4f90748c8));
        setNewAaveV2(address(0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5));
        // 3153600 seconds div 13 second blocks
        setNewBlocksPerYear(242584);
        cTokens[address(0x6B175474E89094C44Da98b954EedeAC495271d0F)] = address(
            0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643
        ); // cDAI
        cTokens[address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)] = address(
            0x39AA39c021dfbaE8faC545936693aC917d5E7563
        ); // cUSDC
        cTokens[address(0xdAC17F958D2ee523a2206206994597C13D831ec7)] = address(
            0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9
        ); // cUSDT
        cTokens[address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)] = address(
            0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5
        ); // cETH
        cTokens[address(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599)] = address(
            0xccF4429DB6322D5C611ee964527D42E5d685DD6a
        ); // cWBTC2
        cTokens[address(0x0000000000085d4780B73119b644AE5ecd22b376)] = address(
            0x12392F67bdf24faE0AF363c24aC620a2f67DAd86
        ); // cTUSD
        cTokens[address(0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2)] = address(
            0x95b4eF2869eBD94BEb4eEE400a99824BF5DC325b
        ); // cMKR
    }

    /**
     * @notice Sets the estimated No. of blocks mined per year
     * @dev Formula used = noOfSecondsInAYear/blockMintNoOfSeconds Eg: _newBlocksPerYear = 3153600/13 = 242584
     * @param _newBlocksPerYear New No. of blocks value estimated per year
     */
    function setNewBlocksPerYear(uint256 _newBlocksPerYear) public onlyOperator {
        blocksPerYear = _newBlocksPerYear;
    }

    /**
     * @notice Sets the new Aave v1 protocol lending pool address
     * @param _newAaveV1 Address of new Aave V1 Lending pool
     */
    function setNewAaveV1(address _newAaveV1) public onlyOperator {
        require(_newAaveV1.isContract(), "!isContract");
        aaveV1 = _newAaveV1;
    }

    /**
     * @notice Sets the new Aave v2 protocol lending pool address
     * @param _newAaveV2 Address of new Aave V2 Lending pool
     */
    function setNewAaveV2(address _newAaveV2) public onlyOperator {
        require(_newAaveV2.isContract(), "!isContract");
        aaveV2 = _newAaveV2;
    }

    /**
     * @inheritdoc IAPROracle
     */
    function getCompoundAPR(address token) public view override returns (uint256) {
        return _getCompoundAPR(token);
    }

    /**
     * @inheritdoc IAPROracle
     */
    function getAaveV1APR(address token) public view override returns (address, uint256) {
        return _getAaveV1APR(token);
    }

    /**
     * @inheritdoc IAPROracle
     */
    function getAaveV2APR(address token) public view override returns (address, uint256) {
        return _getAaveV2APR(token);
    }

    /**
     * @inheritdoc IAPROracle
     */
    function getBestAPR(bytes32 _tokensHash) public view override returns (bytes32) {
        return _getBestAPR(_tokensHash);
    }

    function _getCompoundAPR(address token) internal view returns (uint256) {
        return ICompound(token).supplyRatePerBlock().mul(blocksPerYear);
    }

    function _getAaveV1APR(address token) internal view returns (address, uint256) {
        IAaveV1LendingPoolCore core =
            IAaveV1LendingPoolCore(IAaveV1LendingPoolAddressesProvider(aaveV1).getLendingPoolCore());
        address aToken = core.getReserveATokenAddress(token);
        return (aToken, core.getReserveCurrentLiquidityRate(token).div(1e9));
    }

    function _getAaveV2APR(address token) internal view returns (address, uint256) {
        IAaveV2 lendingPool = IAaveV2(IAaveV2LendingPoolAddressesProvider(aaveV2).getLendingPool());
        ReserveDataV2 memory reserveData = lendingPool.getReserveData(token);
        return (reserveData.aTokenAddress, uint256(reserveData.currentLiquidityRate).div(1e9));
    }

    function _getBestAPR(bytes32 _tokensHash) internal view returns (bytes32) {
        address[] memory tokens = registryContract.getTokensHashToTokenList(_tokensHash);
        (address aTokenV2, uint256 aaveV2APR) = _getAaveV2APR(tokens[0]);
        (address aToken, uint256 aaveV1APR) = _getAaveV1APR(tokens[0]);
        uint256 compoundAPR;
        address cToken = cTokens[tokens[0]];
        bytes32 stepsHash;
        bytes32 bestStrategyHash;

        compoundAPR = cToken != address(0) ? _getCompoundAPR(cToken) : 0;
        if (aaveV1APR == uint256(0) && aaveV2APR == uint256(0) && compoundAPR == uint256(0)) {
            return Constants.ZERO_BYTES32;
        } else {
            if (aaveV1APR > compoundAPR) {
                if (aaveV1APR > aaveV2APR) {
                    stepsHash = keccak256(abi.encodePacked(aToken, aToken, false));
                } else {
                    stepsHash = keccak256(abi.encodePacked(aTokenV2, aTokenV2, false));
                }
            } else {
                if (compoundAPR > aaveV2APR) {
                    stepsHash = keccak256(abi.encodePacked(cToken, cToken, false));
                } else {
                    stepsHash = keccak256(abi.encodePacked(aTokenV2, aTokenV2, false));
                }
            }
            bestStrategyHash = keccak256(abi.encodePacked(_tokensHash, stepsHash));
            return bestStrategyHash;
        }
    }
}
