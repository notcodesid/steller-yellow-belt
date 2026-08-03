//! Live Poll — a Soroban smart contract for a single real-time poll.
//!
//! One poll can exist at a time. Anyone can vote once. The admin can close
//! the poll. Voting emits a `vote_cast` contract event that the frontend
//! listens to for real-time result updates.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, panic_with_error, symbol_short, Address, Env, String, Vec,
};

const POLL_KEY: DataKey = DataKey::Poll;
const VOTERS_KEY: DataKey = DataKey::Voters;

/// One year of ledgers (~5s per ledger).
const TTL: u32 = 31_536_000;

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PollStatus {
    Open,
    Closed,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Poll {
    pub admin: Address,
    pub question: String,
    pub options: Vec<String>,
    pub votes: Vec<u32>,
    pub total_votes: u32,
    pub status: PollStatus,
}

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DataKey {
    Poll,
    Voters,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PollError {
    /// The poll was already initialized.
    AlreadyInitialized,
    /// No poll has been initialized yet.
    NotInitialized,
    /// Only the admin can perform this action.
    NotAdmin,
    /// Polls need between 2 and 10 options.
    InvalidOptions,
    /// The chosen option index does not exist.
    InvalidOption,
    /// This address has already voted.
    AlreadyVoted,
    /// The poll is closed and no longer accepts votes.
    PollClosed,
}

impl From<PollError> for soroban_sdk::Error {
    fn from(e: PollError) -> Self {
        soroban_sdk::Error::from_contract_error(e as u32)
    }
}

#[contract]
pub struct LivePollContract;

#[contractimpl]
impl LivePollContract {
    /// Create the poll. Can only be called once, by the admin.
    pub fn initialize(env: Env, admin: Address, question: String, options: Vec<String>) {
        if env.storage().persistent().has(&POLL_KEY) {
            panic_with_error!(env, PollError::AlreadyInitialized);
        }
        admin.require_auth();

        let len = options.len();
        if len < 2 || len > 10 {
            panic_with_error!(env, PollError::InvalidOptions);
        }

        let mut votes: Vec<u32> = Vec::new(&env);
        for _ in 0..len {
            votes.push_back(0);
        }

        let poll = Poll {
            admin: admin.clone(),
            question,
            options: options.clone(),
            votes,
            total_votes: 0,
            status: PollStatus::Open,
        };

        env.storage().persistent().set(&POLL_KEY, &poll);
        let voters: Vec<Address> = Vec::new(&env);
        env.storage().persistent().set(&VOTERS_KEY, &voters);
        env.storage().persistent().extend_ttl(&POLL_KEY, TTL, TTL);
        env.storage().persistent().extend_ttl(&VOTERS_KEY, TTL, TTL);

        env.events()
            .publish((symbol_short!("created"),), (admin, options));
    }

    /// Cast one vote for `option_index`. Emits a `vote_cast` event.
    /// Returns the new total number of votes.
    pub fn vote(env: Env, voter: Address, option_index: u32) -> u32 {
        voter.require_auth();

        let mut poll = Self::get_poll(&env);
        if poll.status == PollStatus::Closed {
            panic_with_error!(env, PollError::PollClosed);
        }
        if option_index >= poll.options.len() {
            panic_with_error!(env, PollError::InvalidOption);
        }

        let mut voters: Vec<Address> = match env.storage().persistent().get(&VOTERS_KEY) {
            Some(voters) => voters,
            None => Vec::new(&env),
        };
        if voters.iter().any(|v| v == voter) {
            panic_with_error!(env, PollError::AlreadyVoted);
        }

        let current = poll.votes.get(option_index).unwrap();
        poll.votes.set(option_index, current + 1);
        poll.total_votes += 1;
        voters.push_back(voter.clone());

        env.storage().persistent().set(&POLL_KEY, &poll);
        env.storage().persistent().set(&VOTERS_KEY, &voters);
        env.storage().persistent().extend_ttl(&POLL_KEY, TTL, TTL);
        env.storage().persistent().extend_ttl(&VOTERS_KEY, TTL, TTL);

        env.events().publish(
            (symbol_short!("vote_cast"), option_index),
            (voter, poll.total_votes),
        );

        poll.total_votes
    }

    /// Close the poll. Only the admin can do this.
    pub fn close(env: Env, admin: Address) {
        admin.require_auth();
        let mut poll = Self::get_poll(&env);
        if poll.admin != admin {
            panic_with_error!(env, PollError::NotAdmin);
        }
        poll.status = PollStatus::Closed;
        env.storage().persistent().set(&POLL_KEY, &poll);
        env.events().publish((symbol_short!("closed"),), (admin,));
    }

    /// Read the full poll, including live vote counts.
    pub fn get_poll(env: &Env) -> Poll {
        env.storage()
            .persistent()
            .get::<DataKey, Poll>(&POLL_KEY)
            .unwrap_or_else(|| panic_with_error!(env.clone(), PollError::NotInitialized))
    }

    /// Per-option vote counts.
    pub fn results(env: Env) -> Vec<u32> {
        Self::get_poll(&env).votes
    }

    pub fn total_votes(env: Env) -> u32 {
        Self::get_poll(&env).total_votes
    }

    /// True if `voter` has already cast a vote.
    pub fn has_voted(env: Env, voter: Address) -> bool {
        let voters: Vec<Address> = match env.storage().persistent().get(&VOTERS_KEY) {
            Some(voters) => voters,
            None => Vec::new(&env),
        };
        voters.iter().any(|v| v == voter)
    }

    pub fn is_open(env: Env) -> bool {
        Self::get_poll(&env).status == PollStatus::Open
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, vec, String};

    fn setup(env: &Env) -> (LivePollContractClient, Address, Address) {
        env.mock_all_auths();
        let contract_id = env.register_contract(None, LivePollContract);
        let client = LivePollContractClient::new(env, &contract_id);
        let admin = Address::generate(env);
        let voter = Address::generate(env);
        let question = String::from_str(env, "Best blockchain?");
        let options = vec![
            env,
            String::from_str(env, "Stellar"),
            String::from_str(env, "Solana"),
            String::from_str(env, "Bitcoin"),
        ];
        client.initialize(&admin, &question, &options);
        (client, admin, voter)
    }

    #[test]
    fn test_full_flow() {
        let env = Env::default();
        let (client, admin, voter) = setup(&env);

        assert!(client.is_open());
        assert_eq!(client.total_votes(), 0);
        assert!(!client.has_voted(&voter));

        client.vote(&voter, &1);
        let other = Address::generate(&env);
        client.vote(&other, &2);

        assert_eq!(client.total_votes(), 2);
        assert!(client.has_voted(&voter));
        let results = client.results();
        assert_eq!(results.get(0).unwrap(), 0);
        assert_eq!(results.get(1).unwrap(), 1);
        assert_eq!(results.get(2).unwrap(), 1);

        client.close(&admin);
        assert!(!client.is_open());
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #5)")]
    fn test_cannot_vote_twice() {
        let env = Env::default();
        let (client, _, voter) = setup(&env);
        client.vote(&voter, &0);
        client.vote(&voter, &0);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #4)")]
    fn test_invalid_option() {
        let env = Env::default();
        let (client, _, voter) = setup(&env);
        client.vote(&voter, &99);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #0)")]
    fn test_cannot_reinitialize() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, _) = setup(&env);
        client.initialize(
            &admin,
            &String::from_str(&env, "Second poll"),
            &vec![&env, String::from_str(&env, "A"), String::from_str(&env, "B")],
        );
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #6)")]
    fn test_cannot_vote_after_close() {
        let env = Env::default();
        let (client, admin, voter) = setup(&env);
        client.close(&admin);
        client.vote(&voter, &0);
    }
}
