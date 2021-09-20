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

    constructor(address _registry) public Modifiers(_registry) {
        setNewAaveV1(address(0x24a42fD28C976A61Df5D00D0599C34c4f90748c8));
        setNewAaveV2(address(0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5));
        setNewCompound(address(0x922018674c12a7F0D394ebEEf9B58F186CdE13c1));
        // 3153600 seconds div 13 second blocks
        setNewBlocksPerYear(242584);
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
     * @notice Sets the new Compound protocol lending pool address
     * @param _newCompound Address of new Compound Lending pool
     */
    function setNewCompound(address _newCompound) public onlyOperator {
        require(_newCompound.isContract(), "!isContract");
        compound = _newCompound;
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
        uint256 aaveV2APR;
        address aTokenV2;
        (aTokenV2, aaveV2APR) = _getAaveV2APR(tokens[0]);
        uint256 aaveV1APR;
        address aToken;
        (aToken, aaveV1APR) = _getAaveV1APR(tokens[0]);
        uint256 compoundAPR;
        address cToken;
        bytes32 stepsHash;
        bytes32 bestStrategyHash;
        try ICompound(compound).getTokenConfigByUnderlying(tokens[0]) returns (
            ICompound.TokenConfig memory tokenConfig
        ) {
            cToken = tokenConfig.cToken;
            compoundAPR = _getCompoundAPR(cToken);
        } catch {
            cToken = address(0);
            compoundAPR = uint256(0);
        }
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
