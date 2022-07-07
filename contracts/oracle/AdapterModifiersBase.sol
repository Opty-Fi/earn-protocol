// SPDX-License-Identifier: MIT

pragma solidity >0.6.0 <0.9.0;

//  libraries
import { AddressUtils } from '@solidstate/contracts/utils/AddressUtils.sol';

// interfaces
import { IAdapterModifiersBase } from './IAdapterModifiersBase.sol';
import { IAdapterRegistryBase } from './IAdapterRegistryBase.sol';

/**
 * @title AdapterModifiersBase Contract
 * @author Opty.fi
 * @notice Contract used to keep all the modifiers required in Adapter at one place
 */
abstract contract AdapterModifiersBase is IAdapterModifiersBase {
    /**
     * @notice Registry contract instance address
     */
    IAdapterRegistryBase public registryContract;

    using AddressUtils for address;

    constructor(address _registry) {
        registryContract = IAdapterRegistryBase(_registry);
    }

    /**
     * @inheritdoc IAdapterModifiersBase
     */
    function setRegistry(address _registry) external override onlyOperator {
        require(_registry.isContract(), '!isContract');
        registryContract = IAdapterRegistryBase(_registry);
    }

    /**
     * @notice Modifier to check caller is riskOperator or not
     */
    modifier onlyRiskOperator() {
        require(
            msg.sender == registryContract.getRiskOperator(),
            'caller is not the riskOperator'
        );
        _;
    }

    /**
     * @notice Modifier to check caller is operator or not
     */
    modifier onlyOperator() {
        require(
            msg.sender == registryContract.getOperator(),
            'caller is not the operator'
        );
        _;
    }
}
