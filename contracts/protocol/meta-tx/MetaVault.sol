// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import "@openzeppelin/contracts-0.8.x/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts-0.8.x/metatx/MinimalForwarder.sol";
import "@openzeppelin/contracts-0.8.x/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-0.8.x/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-0.8.x/token/ERC20/extensions/draft-IERC20Permit.sol";

interface IERC20PermitLegacy {
    function permit(
        address holder,
        address spender,
        uint256 nonce,
        uint256 expiry,
        bool allowed,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

interface IVault {
    function userDepositVault(
        address _beneficiary,
        uint256 _userDepositUT,
        uint256 _expectedOutput,
        bytes calldata _permitParams,
        bytes32[] calldata _accountsProof
    ) external returns (uint256);

    function underlyingToken() external returns (address);
}

contract MetaVault is ERC2771Context {
    using SafeERC20 for IERC20;

    // solhint-disable-next-line no-empty-blocks
    constructor(address forwarder) ERC2771Context(forwarder) {}

    /**
     * @notice Deposit underlying tokens to the a given OptyFi vault
     * @param _vault the address of the target vault,
     * @param _userDepositUT Amount in underlying token
     * @param _expectedOutput Minimum amount of vault tokens minted after fees
     * @param _permitParams permit parameters: amount, deadline, v, s, r
     * @param _accountsProof merkle proof for caller
     */
    function deposit(
        address _vault,
        uint256 _userDepositUT,
        uint256 _expectedOutput,
        bytes calldata _permitParams,
        bytes32[] calldata _accountsProof
    ) public returns (uint256) {
        address _underlyingToken = IVault(_vault).underlyingToken();

        _permit(_underlyingToken, _permitParams);
        IERC20(_underlyingToken).safeTransferFrom(_msgSender(), address(this), _userDepositUT);
        IERC20(_underlyingToken).approve(_vault, _userDepositUT);

        return IVault(_vault).userDepositVault(_msgSender(), _userDepositUT, _expectedOutput, "0x", _accountsProof);
    }

    /* solhint-disable avoid-low-level-calls*/
    /**
     * @dev execute the permit according to the permit param
     * @param _permitParams data
     */
    function _permit(address _token, bytes calldata _permitParams) internal {
        if (_permitParams.length == 32 * 7) {
            (bool success, ) = _token.call(abi.encodePacked(IERC20Permit.permit.selector, _permitParams));
            require(success, "!permit");
        }

        if (_permitParams.length == 32 * 8) {
            (bool success, ) = _token.call(abi.encodePacked(IERC20PermitLegacy.permit.selector, _permitParams));
            require(success, "!legacy_permit");
        }
    }
}
