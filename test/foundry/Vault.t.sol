// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.12;

import "forge-std/Test.sol";
import "earn-protocol-configuration/contracts/RegistryProxy.sol";
import "earn-protocol-configuration/contracts/Registry.sol";
import "earn-protocol-configuration/contracts/interfaces/opty/IRegistry.sol";

contract VaultTest is Test {
    uint256 testNumber;
    RegistryProxy registryProxy;
    Registry registry;

    function setUp() public {
        testNumber = 42;
        registryProxy = new RegistryProxy();
        registry = new Registry();
        registryProxy.setPendingImplementation(address(registry));
        registry.become(registryProxy);
    }

    function testNumberIs42() public {
        assertEq(testNumber, 42);
    }

    function testFailSubtract43() public {
        testNumber -= 43;
    }

    function testGovernanceIsThisAddress() public {
        assertEq(IRegistry(address(registryProxy)).getGovernance(), address(this));
    }
}
