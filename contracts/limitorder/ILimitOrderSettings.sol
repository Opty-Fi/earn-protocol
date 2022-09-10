// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

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
     * @notice sets the code merkle proof required for the contract to make withdrawals/deposits from the vault
     * @param _proof the code merkle proof
     * @param _vault address of OptyFi vault to set codeProof
     */
    function setCodeProof(bytes32[] memory _proof, address _vault) external;

    /**
     * @notice sets the account merkle proof required for the contract to make withdrawals/deposits from the vault
     * @param _proof the account merkle proof
     * @param _vault address of OptyFi vault to set accountProof
     */
    function setAccountProof(bytes32[] memory _proof, address _vault) external;

    /**
     * @notice sets the liquidation fee for a target vault
     * @param _fee the fee in basis point
     * @param _vault the target vault
     */
    function setVaultLiquidationFee(uint256 _fee, address _vault) external;

    /**
     * @notice sets the address of the OptyFiSwapper diamond
     * @param _swapDiamond the address of the OptyFiSwapper
     */
    function setSwapDiamond(address _swapDiamond) external;

    /**
     * @notice sets the address of the OptyFiOracle to read prices from
     * @param _oracle the address of the OptyFiOracle
     */
    function setOracle(address _oracle) external;

    /**
     * @notice whitelists an OptyFi stable coin vault in the storage mapping, and whitelists its underlying stablecoin
     * @param _vault the address of the OptyFi stable coin vault
     */
    function setVault(address _vault) external;

    /**
     * @notice whitelists multiple OptyFi stable coin vaulst in the storage mapping, and whitelists their underlying stablecoins
     * @param _vaults array of the addresses of the OptyFi stable coin vaults
     */
    function setVaults(address[] memory _vaults) external;

    /**
     * @notice removes an OptyFi stable coin vault from the whitelist state
     * @param _vault address of OptyFi stable coin vault
     */
    function unsetVault(address _vault) external;

    /**
     * @notice removes multiple OptyFi stable coin vaults from the whitelist state
     * @param _vaults addresses of OptyFi stable coin vaults
     */
    function unsetVaults(address[] memory _vaults) external;

    /**
     * @notice sets the optimal swap path for tokenIn and tokenOut
     * @param _tokenIn address of token to be swapped
     * @param _tokenOut address of token to be swapped out
     * @param _path the optimal path encoded along with swap fee
     */
    function setSwapPath(
        address _tokenIn,
        address _tokenOut,
        bytes calldata _path
    ) external;

    /**
     * @notice sets the address of the operation contract that automates limit order execution
     * @param _ops the address of the operation contract
     */
    function setOps(address _ops) external;

    /**
     * @notice sets the address of DEX for swapping tokens
     * @param _exchangeRouter the address of DEX
     */
    function setExchangeRouter(address _exchangeRouter) external;
}
