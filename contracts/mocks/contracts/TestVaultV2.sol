// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

// helpers
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

// interfaces
import { IVaultV2 } from "../../interfaces/opty/IVaultV2.sol";

contract TestVaultV2 {
    using SafeMath for uint256;

    function deposit(
        IVaultV2 _vault,
        ERC20 _token,
        uint256 _amountUT
    ) external {
        _token.transferFrom(msg.sender, address(this), _amountUT);
        _token.approve(address(_vault), _amountUT);
        _vault.userDepositVault(_amountUT);
    }

    function withdraw(IVaultV2 _vault, uint256 _amountVT) external {
        _vault.userWithdrawVault(_amountVT);
    }

    function withdrawERC20(ERC20 _token, address _recipient) external {
        _token.transfer(_recipient, _token.balanceOf(address(this)));
    }

    function withdrawETH(address payable _recipient) external {
        _recipient.transfer(payable(address(this)).balance);
    }

    function testUserDepositPermitted(IVaultV2 _vault, uint256 _valueUT) external view returns (bool, string memory) {
        uint256 _depositFee = _vault.calcDepositFeeUT(_valueUT);
        return _vault.userDepositPermitted(address(this), true, _valueUT.sub(_depositFee), _depositFee);
    }
}
