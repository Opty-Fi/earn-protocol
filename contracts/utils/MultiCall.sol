// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

/**
 * @title MultiCall Contract
 * @author Opty.fi
 * @dev Provides functions used commonly for decoding codes and execute
 * the code calls for Opty.fi contracts
 */
abstract contract MultiCall {
    function executeCode(bytes memory _code, string memory _errorMsg) internal {
        (address _contract, bytes memory _data) = abi.decode(_code, (address, bytes));
        console.log("_contract :", _contract);
        console.log("_data");
        console.logBytes(_data);
        (bool _success, bytes memory _rdata) = _contract.call(_data); //solhint-disable-line avoid-low-level-calls
        console.log("_rdata : ", string(_rdata));
        require(_success, _errorMsg);
        console.log("AAVE balance ", IERC20(0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9).balanceOf(address(this)));
        console.log(
            "AAVE allowance ",
            IERC20(0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9).allowance(
                address(this),
                0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F
            )
        );
    }

    function executeCodes(bytes[] memory _codes, string memory _errorMsg) internal {
        for (uint256 _j = 0; _j < _codes.length; _j++) {
            executeCode(_codes[_j], _errorMsg);
        }
    }
}
