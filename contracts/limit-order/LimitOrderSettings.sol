// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { ILimitOrderSettings } from "../interfaces/limit-order/ILimitOrderSettings.sol";
import { LimitOrderInternal } from "./LimitOrderInternal.sol";
import { LimitOrderStorage } from "./LimitOrderStorage.sol";
import { IERC20 } from "@solidstate/contracts/token/ERC20/IERC20.sol";

/**
 * @title LimitOrderSettings
 * @author OptyFi
 * @dev contains all governance-facing actions
 */
abstract contract LimitOrderSettings is LimitOrderInternal, ILimitOrderSettings {
    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setTreasury(address _treasury) external onlyOwner {
        _setTreasury(LimitOrderStorage.layout(), _treasury);
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setAccountProof(bytes32[] memory _proof, address _vault) external onlyOwner {
        _setAccountProof(LimitOrderStorage.layout(), _proof, _vault);
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setVaultLiquidationFee(uint256 _fee, address _vault) external onlyOwner {
        _setVaultLiquidationFee(LimitOrderStorage.layout(), _fee, _vault);
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setOracle(address _oracle) external onlyOwner {
        _setOracle(LimitOrderStorage.layout(), _oracle);
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setVault(address _vault) external onlyOwner {
        _setVault(LimitOrderStorage.layout(), _vault);
    }

    /*solhint-disable  use-forbidden-name*/
    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setVaults(address[] memory _vaults) external onlyOwner {
        LimitOrderStorage.Layout storage l = LimitOrderStorage.layout();
        uint256 length = _vaults.length;

        unchecked {
            for (uint256 i; i < length; ) {
                _setVault(l, _vaults[i]);
                ++i;
            }
        }
    }

    /*solhint-enable  use-forbidden-name*/

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function unsetVault(address _vault) external onlyOwner {
        _unsetVault(LimitOrderStorage.layout(), _vault);
    }

    /*solhint-disable  use-forbidden-name*/
    /**
     * @inheritdoc ILimitOrderSettings
     */
    function unsetVaults(address[] memory _vaults) external onlyOwner {
        LimitOrderStorage.Layout storage l = LimitOrderStorage.layout();
        uint256 length = _vaults.length;

        unchecked {
            for (uint256 i; i < length; ) {
                _unsetVault(l, _vaults[i]);
                ++i;
            }
        }
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setStablecoinVault(address _vault) external onlyOwner {
        _setStablecoinVault(LimitOrderStorage.layout(), _vault);
    }

    /*solhint-disable  use-forbidden-name*/
    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setStablecoinVaults(address[] memory _vaults) external onlyOwner {
        LimitOrderStorage.Layout storage l = LimitOrderStorage.layout();
        uint256 length = _vaults.length;

        unchecked {
            for (uint256 i; i < length; ) {
                _setStablecoinVault(l, _vaults[i]);
                ++i;
            }
        }
    }

    /*solhint-enable  use-forbidden-name*/

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function unsetStablecoinVault(address _vault) external onlyOwner {
        _unsetStablecoinVault(LimitOrderStorage.layout(), _vault);
    }

    /*solhint-disable  use-forbidden-name*/
    /**
     * @inheritdoc ILimitOrderSettings
     */
    function unsetStablecoinVaults(address[] memory _vaults) external onlyOwner {
        LimitOrderStorage.Layout storage l = LimitOrderStorage.layout();
        uint256 length = _vaults.length;

        unchecked {
            for (uint256 i; i < length; ) {
                _unsetStablecoinVault(l, _vaults[i]);
                ++i;
            }
        }
    }

    /*solhint-enable  use-forbidden-name*/

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function setOps(address _ops) external onlyOwner {
        _setOps(LimitOrderStorage.layout(), _ops);
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function giveAllowances(IERC20[] calldata _tokens, address[] calldata _spenders) external onlyOwner {
        _giveAllowances(_tokens, _spenders);
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function removeAllowances(IERC20[] calldata _tokens, address[] calldata _spenders) external onlyOwner {
        _removeAllowances(_tokens, _spenders);
    }

    /**
     * @inheritdoc ILimitOrderSettings
     */
    function inCaseTokensGetStuck(
        IERC20 _token,
        address _recipient,
        uint256 _amount
    ) external onlyOwner {
        _inCaseTokensGetStuck(_token, _recipient, _amount);
    }
}
