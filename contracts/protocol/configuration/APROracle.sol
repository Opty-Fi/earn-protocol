// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.6.10;
pragma experimental ABIEncoderV2;

import { SafeERC20, IERC20, SafeMath, Address } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { Modifiers } from "./Modifiers.sol";
import { IAPROracle } from "../../interfaces/opty/IAPROracle.sol";
import { ReserveDataV1, IAaveV1 } from "../../interfaces/aave/v1/IAaveV1.sol";
import { IAaveV1LendingPoolAddressesProvider } from "../../interfaces/aave/v1/IAaveV1LendingPoolAddressesProvider.sol";
import { IAaveV1LendingPoolCore } from "../../interfaces/aave/v1/IAaveV1LendingPoolCore.sol";
import { ReserveDataV2, IAaveV2 } from "../../interfaces/aave/v2/IAaveV2.sol";
import { IAaveV2LendingPoolAddressesProvider } from "../../interfaces/aave/v2/IAaveV2LendingPoolAddressesProvider.sol";
import { ICompound } from "../../interfaces/compound/ICompound.sol";

/*
 * @author OptyFi inspired on yearn.finance APROracle contract
 */
contract APROracle is IAPROracle, Modifiers {
    using SafeMath for uint256;
    using Address for address;

    uint256 public constant DECIMAL = 10**18;
    bytes32 public constant ZERO_BYTES32 = 0x0000000000000000000000000000000000000000000000000000000000000000;

    address public aaveV1;
    address public aaveV2AddressProvider;
    address public compound;

    uint256 public dydxModifier;
    uint256 public blocksPerYear;

    constructor(address _registry) public Modifiers(_registry) {
        aaveV1 = address(0x24a42fD28C976A61Df5D00D0599C34c4f90748c8);
        aaveV2AddressProvider = address(0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5);
        compound = address(0x922018674c12a7F0D394ebEEf9B58F186CdE13c1);
        // 3153600 seconds div 13 second blocks
        blocksPerYear = 242584;
    }

    function setNewAaveV1(address _newAaveV1) external onlyOperator {
        aaveV1 = _newAaveV1;
    }

    function setNewBlocksPerYear(uint256 _newBlocksPerYear) external onlyOperator {
        blocksPerYear = _newBlocksPerYear;
    }

    function getCompoundAPR(address token) external view override returns (uint256) {
        return _getCompoundAPR(token);
    }

    function getAaveV1APR(address token) external view override returns (address, uint256) {
        return _getAaveV1APR(token);
    }

    function getAaveV2APR(address token) external view override returns (address, uint256) {
        return _getAaveV2APR(token);
    }

    function getBestAPR(bytes32 _tokensHash) external view override returns (bytes32) {
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
        IAaveV2 lendingPool = IAaveV2(IAaveV2LendingPoolAddressesProvider(aaveV2AddressProvider).getLendingPool());
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
            return ZERO_BYTES32;
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
