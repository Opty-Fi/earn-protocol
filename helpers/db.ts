import gql from "graphql-tag";
import { ApolloClient } from "apollo-client";
import fetch from "cross-fetch";
import { createHttpLink } from "apollo-link-http";
import { InMemoryCache } from "apollo-cache-inmemory";
require("dotenv").config();

const httpLink = createHttpLink({
    uri: process.env.OPTY_SERVER,
    fetch: fetch,
});

const client = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
});

const CREATE_VAULT = gql`
    mutation createVault($hash: String!) {
        createVault(transactionHash: $hash) {
            name
            profile
            token
        }
    }
`;

const CREATE_TOKEN_CONTRACT = gql`
    mutation createTokenContract($input: TokenContractInput!) {
        createTokenContract(input: $input) {
            token
            contractName
            contractAddress
        }
    }
`;

const LOGIN = gql`
    mutation login {
        login(input: { email: "${process.env.DATA_LOGIN_EMAIL}", password: "${process.env.DATA_LOGIN_PASSWORD}" }) {
            userId
            name
            email
            token
            roles {
                name
                permissions {
                    name
                    permissionId
                }
            }
        }
    }
`;

const login = async () => {
    const login = await client.mutate({
        mutation: LOGIN,
    });
    return login.data.login.token;
};

export const insertVaultIntoDB = async (transactionHash: string): Promise<string> => {
    try {
        const token = await login();
        await client.mutate({
            mutation: CREATE_VAULT,
            variables: {
                hash: transactionHash,
            },
            context: {
                // example of setting the headers with context per operation
                headers: {
                    authorization: token,
                },
            },
        });
        return "";
    } catch (error) {
        return error.message ? error.message : error;
    }
};

export const insertContractIntoDB = async (
    contractName: string,
    contractAddress: string
): Promise<string> => {
    try {
        const token = await login();
        await client.mutate({
            mutation: CREATE_TOKEN_CONTRACT,
            variables: {
                input: {
                    token: "0x0000000000000000000000000000000000000000",
                    contractName: contractName,
                    contractAddress: contractAddress,
                },
            },
            context: {
                // example of setting the headers with context per operation
                headers: {
                    authorization: token,
                },
            },
        });
        return "";
    } catch (error) {
        return error.message ? error.message : error;
    }
};
