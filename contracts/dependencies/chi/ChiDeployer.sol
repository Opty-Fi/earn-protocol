// solhint-disable
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

interface IFreeFromUpTo {
    function freeFromUpTo(address from, uint256 value) external returns (uint256 freed);
}

abstract contract Deployer {
    IFreeFromUpTo public constant gst = IFreeFromUpTo(0x0000000000b3F879cb30FE243b4Dfee438691c04);
    IFreeFromUpTo public constant chi = IFreeFromUpTo(0x0000000000004946c0e9F43F4Dee607b0eF1fA1c);

    modifier discountCHI() {
        uint256 gasStart = gasleft();
        _;
        uint256 gasSpent = 21000 + gasStart - gasleft() + 16 * msg.data.length;
        chi.freeFromUpTo(msg.sender, (gasSpent + 14154) / 41130);
    }
}
