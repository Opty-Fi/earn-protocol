// SPDX-License-Identifier:MIT

pragma solidity ^0.8.0;

import "../interfaces/IForwarder.sol";

library GsnTypes {
    struct RelayData {
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        uint256 transactionCalldataGasUsed;
        address relayWorker;
        address paymaster;
        address forwarder;
        bytes paymasterData;
        uint256 clientId;
    }

    struct RelayRequest {
        IForwarder.ForwardRequest request;
        RelayData relayData;
    }
}
