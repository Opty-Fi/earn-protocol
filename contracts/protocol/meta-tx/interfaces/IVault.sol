//SPDX-license-identifier: MIT
pragma solidity ^0.8.15;

interface IVault {
    /**
     * @notice Deposit underlying tokens to the vault
     * @dev Mint the shares right away as per oracle based price per full share value
     * @param _beneficiary the address of the deposit beneficiary,
     *        if _beneficiary = address(0) => _beneficiary = msg.sender
     * @param _userDepositUT Amount in underlying token
     * @param _expectedOutput expected output
     * @param _permitParams permit parameters: amount, deadline, v, s, r
     * @param _accountsProof merkle proof for caller
     */
    function userDepositVault(
        address _beneficiary,
        uint256 _userDepositUT,
        uint256 _expectedOutput,
        bytes calldata _permitParams,
        bytes32[] calldata _accountsProof
    ) external returns (uint256);

    /**
     * @notice redeems the vault shares and transfers underlying token to `_beneficiary`
     * @dev Burn the shares right away as per oracle based price per full share value
     * @param _receiver the address which will receive the underlying tokens
     * @param _userWithdrawVT amount in vault token
     * @param _expectedOutput expected output
     * @param _accountsProof merkle proof for caller
     */
    function userWithdrawVault(
        address _receiver,
        uint256 _userWithdrawVT,
        uint256 _expectedOutput,
        bytes32[] calldata _accountsProof
    ) external returns (uint256);

    /**
     * @dev the vault underlying token contract address
     */
    function underlyingToken() external returns (address);
}
