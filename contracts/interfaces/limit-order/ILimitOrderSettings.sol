// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { IERC20 } from "@solidstate/contracts/token/ERC20/IERC20.sol";

/**
 * @title Interface for LimitOrderSettings facet
 * @author OptyFi
 */
interface ILimitOrderSettings {
    /**
     * @notice sets the address of the treasury to send limit order fees to
     * @param _treasury the address of the treasury
     */
    function setTreasury(address _treasury) external;

    /**
     * @notice sets the account merkle proof required for the contract to make withdrawals/deposits from the vault
     * @param _proof the account merkle proof
     * @param _vault address of OptyFi vault to set accountProof
     */
    function setAccountProof(bytes32[] memory _proof, address _vault) external;

    /**
     * @notice sets the liquidation fee for a target vault
     * @param _fee the fee in basis point (1e18)
     * @param _vault the non-stable coin vault address
     */
    function setVaultLiquidationFee(uint256 _fee, address _vault) external;

    /**
     * @notice sets the address of the OptyFiOracle to read prices from
     * @param _oracle the address of the OptyFiOracle
     */
    function setOracle(address _oracle) external;

    /**
     * @notice whitelists an OptyFi non-stable coin vault in the storage mapping,
     *         and whitelists its underlying token
     * @param _vault the address of the OptyFi non-stablecoin vault
     */
    function setVault(address _vault) external;

    /**
     * @notice whitelists multiple OptyFi non-stable coin vaults in the storage mapping,
     *         and whitelists their underlying tokens
     * @param _vaults array of the addresses of the OptyFi non-stable coin vaults
     */
    function setVaults(address[] memory _vaults) external;

    /**
     * @notice removes an OptyFi non-stable coin vault from the whitelist state
     * @param _vault address of OptyFi non-stable coin vault
     */
    function unsetVault(address _vault) external;

    /**
     * @notice removes multiple OptyFi non-stable coin vaults from the whitelist state
     * @param _vaults addresses of OptyFi non-stable coin vaults
     */
    function unsetVaults(address[] memory _vaults) external;

    /**
     * @notice whitelists an OptyFi stable coin vault in the storage mapping,
     *         and whitelists its underlying stablecoin
     * @param _vault the address of the OptyFi stable coin vault
     */
    function setStablecoinVault(address _vault) external;

    /**
     * @notice whitelists multiple OptyFi stable coin vaulst in the storage mapping,
     *         and whitelists their underlying stablecoins
     * @param _vaults array of the addresses of the OptyFi stable coin vaults
     */
    function setStablecoinVaults(address[] memory _vaults) external;

    /**
     * @notice removes an OptyFi stable coin vault from the whitelist state
     * @param _vault address of OptyFi stable coin vault
     */
    function unsetStablecoinVault(address _vault) external;

    /**
     * @notice removes multiple OptyFi stable coin vaults from the whitelist state
     * @param _vaults addresses of OptyFi stable coin vaults
     */
    function unsetStablecoinVaults(address[] memory _vaults) external;

    /**
     * @notice sets the address of the operation contract that automates limit order execution
     * @param _ops the address of the operation contract
     */
    function setOps(address _ops) external;

    /**
     * @notice provides allowances to target contract to spend this contract owned tokens
     * @dev the length of tokens and spenders should be same
     * @param _tokens the array of token addresses
     * @param _spenders the array of spender contract
     */
    function giveAllowances(IERC20[] calldata _tokens, address[] calldata _spenders) external;

    /**
     * @notice resets allowances to target contract to spend this contract owned tokens
     * @dev the length of tokens and spenders should be same
     * @param _tokens the array of token addresses
     * @param _spenders the array of spender contract
     */
    function removeAllowances(IERC20[] calldata _tokens, address[] calldata _spenders) external;

    /**
     * @notice transfer tokens to beneficiary incase it get stuck in this contract
     * @param _token the token address
     * @param _recipient beneficiary address to receive tokens
     * @param _amount amount of tokens to transfer
     */
    function inCaseTokensGetStuck(
        IERC20 _token,
        address _recipient,
        uint256 _amount
    ) external;
}
