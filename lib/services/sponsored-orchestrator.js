const { ethers } = require('ethers');

// Default configuration for supported chains
const DEFAULT_CONFIG = {
    chainId: 137, // Polygon mainnet
    delegationAddress: '0x9a686f5eae58b62b435eaa034d48e57dc94bc36c', // Delegation contract address
    providerUrl: 'https://polygon-rpc.com', // Polygon RPC
    relayerEndpoint: 'https://cpprhb1jz6.execute-api.us-east-1.amazonaws.com/relay', // AWS Lambda URL
    maxRetries: 30,
    retryDelayMs: 2000
};

// Export for chain validation
const SPONSORED_CONFIG = {
    chainId: 137, // Polygon mainnet
    supportedChains: [137] // Currently only Polygon
};

// Contract ABI
const CONTRACT_ABI = [
    "function execute((address,uint256,bytes)[] calls) external payable",
    "function execute((address,uint256,bytes)[] calls, bytes signature) external payable",
    "function nonce() external view returns (uint256)"
];

class SponsoredOrchestrator {
    constructor(chainId = 137, privateKey, config = {}) {
        // Merge default config with provided config
        this.config = {
            ...DEFAULT_CONFIG,
            chainId,
            ...config
        };
        
        // Validate chain is supported
        if (!SponsoredOrchestrator.isChainSupported(chainId)) {
            throw new Error(`Chain ID ${chainId} is not supported for sponsored transactions`);
        }
        
        this.provider = new ethers.JsonRpcProvider(this.config.providerUrl);
        this.eoaWallet = new ethers.Wallet(privateKey, this.provider);
    }

    /**
     * Static method to check if a chain is supported for sponsored transactions
     */
    static isChainSupported(chainId) {
        return SPONSORED_CONFIG.supportedChains.includes(chainId);
    }

    /**
     * Verify that the delegation contract exists and has the correct interface
     */
    async verifyDelegationContract() {
        try {
            console.log(`🔍 Verifying delegation contract at ${this.config.delegationAddress}...`);
            
            // Check if contract exists
            const code = await this.provider.getCode(this.config.delegationAddress);
            if (code === "0x") {
                throw new Error(`No contract found at delegation address ${this.config.delegationAddress}`);
            }
            
            console.log(`✅ Contract exists at ${this.config.delegationAddress}`);
            
            // Try to call nonce() to verify interface
            const contract = new ethers.Contract(this.config.delegationAddress, CONTRACT_ABI, this.provider);
            const nonce = await contract.nonce();
            console.log(`✅ Contract nonce: ${nonce}`);
            
            return true;
        } catch (error) {
            console.error(`❌ Delegation contract verification failed:`, error.message);
            return false;
        }
    }

    /**
     * Main function to orchestrate sponsored token transfer
     * Checks delegation, sets up if needed, then executes transfer
     */
    async executeSponsoredTransfer({ tokenAddress, toAddress, amount, chainId, privateKey }) {
        console.log('🎯 SPONSORED TOKEN TRANSFER ORCHESTRATOR');
        console.log('=' .repeat(50));
        console.log(`EOA: ${this.eoaWallet.address}`);
        console.log(`Receiver: ${toAddress}`);
        console.log(`Amount: ${amount} tokens`);
        console.log(`Token: ${tokenAddress}`);
        console.log(`Network: ${this.config.chainId} (${this.config.chainId === 137 ? 'Polygon' : this.config.chainId === 11155111 ? 'Sepolia' : 'Unknown'})`);
        console.log('');

        try {
            // Store transfer parameters in config for use in other methods
            this.config.tokenAddress = tokenAddress;
            this.config.toAddress = toAddress;
            this.config.amount = amount;

            // Step 0: Verify delegation contract
            console.log('🔍 Step 0: Verifying delegation contract...');
            const contractVerified = await this.verifyDelegationContract();
            if (!contractVerified) {
                throw new Error('Delegation contract verification failed');
            }
            console.log('');
            // Step 1: Check delegation status
            console.log('📋 Step 1: Checking delegation status...');
            const delegationStatus = await this.checkDelegationStatus();
            
            if (!delegationStatus.isDelegated || !delegationStatus.matchesTarget) {
                console.log('❌ Delegation not found or incorrect. Setting up delegation...');
                
                // Step 2: Create and send delegation transaction
                const delegationTxHash = await this.setupDelegation();
                
                // Step 3: Monitor delegation transaction
                console.log('⏳ Monitoring delegation transaction...');
                const delegationSuccess = await this.monitorTransaction(delegationTxHash, 'Delegation');
                
                if (!delegationSuccess) {
                    throw new Error('Delegation setup failed');
                }
                
                console.log('✅ Delegation setup completed successfully!');
                
                // Wait a moment for blockchain state to update
                console.log('⏳ Waiting for blockchain state to update...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Re-check delegation status after delay
                console.log('🔍 Re-checking delegation status after delay...');
                const updatedDelegationStatus = await this.checkDelegationStatus();
                if (!updatedDelegationStatus.isDelegated || !updatedDelegationStatus.matchesTarget) {
                    console.log('⚠️ Delegation still not detected after delay. This might be a network issue.');
                }
            } else {
                console.log('✅ Delegation already active');
            }

            // Step 4: Execute sponsored token transfer
            console.log('\n💰 Step 4: Executing sponsored token transfer...');
            const transferTxHash = await this.executeTokenTransfer();
            
            // Step 5: Monitor token transfer
            console.log('⏳ Monitoring token transfer...');
            const transferSuccess = await this.monitorTransaction(transferTxHash, 'Token Transfer');
            
            if (!transferSuccess) {
                throw new Error('Token transfer failed');
            }
            
            console.log('\n🎉 SUCCESS! Sponsored token transfer completed!');
            return {
                success: true,
                delegationTxHash: delegationStatus.matchesTarget ? null : await this.getLastDelegationTx(),
                transferTxHash: transferTxHash,
                transactionHash: transferTxHash
            };

        } catch (error) {
            console.error('\n❌ Orchestration failed:', error.message);
            throw error;
        }
    }

    /**
     * Check if EOA has delegation to the target contract
     */
    async checkDelegationStatus() {
        try {
            const code = await this.provider.getCode(this.eoaWallet.address);
            
            console.log(`🔍 Checking delegation for ${this.eoaWallet.address}`);
            console.log(`📝 Code at address: ${code}`);
            console.log(`📝 Code length: ${code.length}`);
            
            if (code === "0x") {
                console.log('❌ No code found - not delegated');
                return { isDelegated: false, delegatedTo: null };
            }
            
            if (code.startsWith("0xef0100")) {
                const delegatedAddress = "0x" + code.slice(8);
                const normalizedDelegatedAddress = ethers.getAddress(delegatedAddress);
                const normalizedTargetAddress = ethers.getAddress(this.config.delegationAddress);
                
                console.log(`✅ EIP-7702 delegation found`);
                console.log(`📍 Delegated to: ${normalizedDelegatedAddress}`);
                console.log(`🎯 Target address: ${normalizedTargetAddress}`);
                console.log(`🔍 Match: ${normalizedDelegatedAddress === normalizedTargetAddress}`);
                
                return { 
                    isDelegated: true, 
                    delegatedTo: normalizedDelegatedAddress,
                    matchesTarget: normalizedDelegatedAddress === normalizedTargetAddress
                };
            }
            
            console.log('❓ Address has code but not EIP-7702 delegation');
            return { isDelegated: true, delegatedTo: null }; // has code but not EIP-7702
        } catch (error) {
            console.error("Error checking delegation status:", error);
            return { isDelegated: false, delegatedTo: null };
        }
    }

    /**
     * Setup delegation by creating authorization and sending via relayer
     */
    async setupDelegation() {
        console.log('🔧 Creating EIP-7702 authorization...');
        
        // Get the current nonce for the EOA
        const currentNonce = await this.provider.getTransactionCount(this.eoaWallet.address);
        console.log(`📊 Current EOA nonce: ${currentNonce}`);
        
        // Create authorization
        const authorization = await this.eoaWallet.authorize({
            address: this.config.delegationAddress,
            nonce: currentNonce, // Use current nonce
            chainId: this.config.chainId
        });
        
        console.log('✅ Authorization created');
        console.log(`   Address: ${authorization.address}`);
        console.log(`   Nonce: ${authorization.nonce}`);
        
        // Create EIP-7702 transaction payload
        const eip7702Payload = {
            type: 4,
            to: this.eoaWallet.address,
            value: 0,
            data: '0x',
            gasLimit: 120000,
            authorizationList: [authorization]
        };
        
        // Send via relayer
        return await this.sendToRelayer(eip7702Payload, 'Delegation Setup');
    }

    /**
     * Execute sponsored token transfer
     */
    async executeTokenTransfer() {
        try {
            // Build token transfer call
            const calls = this.buildTokenTransferCalls();
            console.log(`📋 Built token transfer calls:`, calls);
            
            // Get contract nonce - this is where the error was occurring
            console.log(`🔍 Getting nonce from delegated contract at ${this.eoaWallet.address}...`);
            const delegatedContract = new ethers.Contract(this.eoaWallet.address, CONTRACT_ABI, this.provider);
            
            // Check if the EOA has been delegated
            const code = await this.provider.getCode(this.eoaWallet.address);
            if (code === "0x") {
                throw new Error(`EOA ${this.eoaWallet.address} has not been delegated to any contract`);
            }
            
            const contractNonce = await delegatedContract.nonce();
            console.log(`✅ Contract nonce: ${contractNonce}`);
            
            // Create signature
            const signature = await this.createSignatureForCalls(calls, contractNonce);
            console.log(`✅ Signature created`);
            
            // Create sponsored execution transaction
            const executionPayload = this.createSponsoredExecutionPayload(calls, signature);
            console.log(`✅ Execution payload created`);
            
            // Send via relayer
            return await this.sendToRelayer(executionPayload, 'Token Transfer');
            
        } catch (error) {
            console.error(`❌ Token transfer execution failed:`, error.message);
            throw error;
        }
    }

    /**
     * Build token transfer calls
     */
    buildTokenTransferCalls() {
        const erc20Iface = new ethers.Interface([
            'function transfer(address to, uint256 amount) external returns (bool)'
        ]);
        
        // For now, assume 6 decimals (like USDC). In a real implementation, 
        // you'd want to get the token decimals dynamically
        const decimals = 6;
        const data = erc20Iface.encodeFunctionData('transfer', [
            this.config.toAddress, 
            ethers.parseUnits(this.config.amount, decimals)
        ]);
        
        return [
            [this.config.tokenAddress, 0, data]
        ];
    }

    /**
     * Create signature for calls
     */
    async createSignatureForCalls(calls, contractNonce) {
        let encodedCalls = '0x';
        for (const call of calls) {
            const [to, value, data] = call;
            encodedCalls += ethers.solidityPacked(['address', 'uint256', 'bytes'], [to, value, data]).slice(2);
        }
        
        const digest = ethers.keccak256(
            ethers.solidityPacked(['uint256', 'bytes'], [contractNonce, encodedCalls])
        );
        
        return await this.eoaWallet.signMessage(ethers.getBytes(digest));
    }

    /**
     * Create sponsored execution transaction payload
     */
    createSponsoredExecutionPayload(calls, signature) {
        const contractInterface = new ethers.Interface(CONTRACT_ABI);
        // Use the specific function signature with signature parameter
        const data = contractInterface.encodeFunctionData('execute((address,uint256,bytes)[],bytes)', [calls, signature]);
        
        return {
            to: this.eoaWallet.address,
            value: 0,
            data: data,
            gasLimit: 200000
        };
    }

    /**
     * Convert BigInt values to strings for JSON serialization
     */
    convertBigIntToString(obj) {
        if (obj === null || obj === undefined) {
            return obj;
        }
        
        if (typeof obj === 'bigint') {
            return obj.toString();
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.convertBigIntToString(item));
        }
        
        if (typeof obj === 'object') {
            // Handle signature objects specially (both _type: 'signature' and Signature class instances)
            if ((obj._type === 'signature' && obj.r && obj.s && obj.v !== undefined) ||
                (obj.r && obj.s && (obj.v !== undefined || obj.yParity !== undefined))) {
                return {
                    r: obj.r,
                    s: obj.s,
                    v: obj.v || obj.yParity
                };
            }
            
            const converted = {};
            for (const [key, value] of Object.entries(obj)) {
                // Skip _type and networkV properties as they're not needed for serialization
                if (key === '_type' || key === 'networkV') {
                    continue;
                }
                converted[key] = this.convertBigIntToString(value);
            }
            return converted;
        }
        
        return obj;
    }

    /**
     * Send transaction to relayer (local or remote)
     */
    async sendToRelayer(payload, operation) {
        console.log(`📡 Sending ${operation} to relayer...`);
        
        const event = {
            payload: payload,
            chainId: this.config.chainId
        };
        
        // Convert BigInt values to strings for JSON serialization
        const serializableEvent = this.convertBigIntToString(event);
        
        try {
            let result;
            
                // Use remote Lambda endpoint (for when deployed)
                const response = await fetch(this.config.relayerEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(serializableEvent)
                });
                
                result = await response.json();
                
                if (!response.ok) {
                    throw new Error(`HTTP error: ${response.status}`);
                }
            
            
            if (!result.success) {
                throw new Error(`Relayer error: ${result.error || 'Unknown error'}`);
            }
            
            console.log(`✅ ${operation} sent successfully: ${result.transactionHash}`);
            return result.transactionHash;
            
        } catch (error) {
            console.error(`❌ Failed to send ${operation} to relayer:`, error.message);
            throw error;
        }
    }

    /**
     * Monitor transaction until completion or timeout
     */
    async monitorTransaction(txHash, operation) {
        console.log(`🔍 Monitoring ${operation} transaction: ${txHash}`);
        
        for (let i = 0; i < this.config.maxRetries; i++) {
            try {
                const receipt = await this.provider.getTransactionReceipt(txHash);
                
                if (receipt) {
                    if (receipt.status === 1) {
                        console.log(`✅ ${operation} confirmed in block ${receipt.blockNumber}`);
                        console.log(`⛽ Gas used: ${receipt.gasUsed}`);
                        return true;
                    } else {
                        console.log(`❌ ${operation} failed in block ${receipt.blockNumber}`);
                        return false;
                    }
                }
                
                console.log(`⏳ ${operation} pending... (attempt ${i + 1}/${this.config.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
                
            } catch (error) {
                console.log(`⚠️ Error checking ${operation} status: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
            }
        }
        
        console.log(`⏰ ${operation} monitoring timeout after ${this.config.maxRetries} attempts`);
        return false;
    }

    /**
     * Get the last delegation transaction hash (for tracking)
     */
    async getLastDelegationTx() {
        // This would need to be implemented based on your tracking mechanism
        // For now, return null as we don't have persistent storage
        return null;
    }

    /**
     * Log current balances for verification
     */
    async logBalances(stage) {
        console.log(`\n💰 ${stage} BALANCES:`);
        
        try {
            const eoaEth = await this.provider.getBalance(this.eoaWallet.address);
            console.log(`   EOA ETH: ${ethers.formatEther(eoaEth)}`);
            
            // Get token balance if we have the contract
            try {
                if (this.config.tokenAddress) {
                    const tokenContract = new ethers.Contract(this.config.tokenAddress, [
                        'function balanceOf(address owner) view returns (uint256)',
                        'function decimals() view returns (uint8)',
                        'function symbol() view returns (string)'
                    ], this.provider);
                    
                    const balance = await tokenContract.balanceOf(this.eoaWallet.address);
                    const decimals = await tokenContract.decimals();
                    const symbol = await tokenContract.symbol();
                    const formattedBalance = ethers.formatUnits(balance, decimals);
                    console.log(`   EOA ${symbol}: ${formattedBalance}`);
                }
            } catch (error) {
                console.log(`   EOA Token: Unable to fetch`);
            }
            
        } catch (error) {
            console.log(`   ⚠️ Balance check failed: ${error.message}`);
        }
    }
}

// Main execution function
async function main() {
    console.log('🚀 Starting Sponsored Transaction Orchestrator...\n');
    
    try {
        // Example usage - you would pass actual values
        const chainId = 137;
        const privateKey = 'c7c935fcbce3df48ae916f18fa3a57d5ebbe58aa27459ceb752da459338e16f5';
        const orchestrator = new SponsoredOrchestrator(chainId, privateKey);
        
        // Log initial balances
        await orchestrator.logBalances('INITIAL');
        
        // Execute the full flow with example parameters
        const result = await orchestrator.executeSponsoredTransfer({
            tokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC
            toAddress: '0xf9716ebec7f44c02052DAd56893605e7Ee8bbD71',
            amount: '0.1',
            chainId: chainId,
            privateKey: privateKey
        });
        
        // Log final balances
        await orchestrator.logBalances('FINAL');
        
        console.log('\n🏆 Orchestration completed successfully!');
        console.log('Results:', result);
        
    } catch (error) {
        console.error('\n❌ Orchestration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    SponsoredOrchestrator,
    SPONSORED_CONFIG
};
