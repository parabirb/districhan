/*
    gateway
    a minimal, simple-to-use districhan gateway meeting the API standard
    written by parabirb, 2022
    dedicated to the ES module haters in the chat
    public domain
*/

// deps
import * as fs from "fs";
import express from "express";
import { TCP } from "@libp2p/tcp";
import EventEmitter from "events";
import * as pow from "proof-of-work";
import { createLibp2p } from "libp2p";
import { Mplex } from "@libp2p/mplex";
import { KadDHT } from "@libp2p/kad-dht";
import { default as sse } from "better-sse";
import { Bootstrap } from "@libp2p/bootstrap";
import { Noise } from "@chainsafe/libp2p-noise";
import { GossipSub } from "@chainsafe/libp2p-gossipsub";
import config from "./config.json" assert { type: "json" };

// create node
async function createNode() {
    let node = await createLibp2p({
        addresses: {
            listen: ["/ip4/0.0.0.0/tcp/0"]
        },
        transports: [new TCP()],
        streamMuxers: [new Mplex()],
        connectionEncryption: [new Noise()],
        pubsub: new GossipSub({
            emitSelf: true,
            doPX: true
        }),
        dht: new KadDHT({
            kBucketSize: 20,
            enabled: true,
            randomWalk: {
                enabled: true
            }
        }),
        peerDiscovery: [
            new Bootstrap({
                interval: 60e3,
                list: [
                    "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
                    "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
                    "/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp",
                    "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
                    "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt"
                ]
            })
        ]
    });
    await node.start();
    return node;
}

// main function
async function main() {
    // consts
    const supportedBoards = {
        "gen": "Random/General",
        "mu": "Music",
        "tech": "Technology",
        "sci": "Science",
        "lgbt": "LGBT",
        "fur": "Furry",
        "urbx": "Urban Exploration"
    };
    const mem = {};
    for (let key of Object.keys(supportedBoards)) mem[key] = [];

    // this function lets us read timestamps from solved PoWs
    function readTimestamp(buffer, off) {
        return (buffer.readUInt32BE(off) * 0x100000000) +
            buffer.readUInt32BE(off + 4);
    }

    // init the express app and use json body parser
    const app = new express();
    app.use(express.json());

    // init the PoW verifier
    const verifier = new pow.Verifier({
        size: 131072,
        n: 13,
        complexity: 20,
        validity: 30000
    });
    setInterval(() => verifier.reset(), 30000);

    // init everything required for gossipsub
    const channel = sse.createChannel();
    const node = await createNode();
    const node2 = await createNode();
    await node.pubsub.subscribe("districhan");
    await node2.pubsub.subscribe("districhan");
    node.pubsub.addEventListener("message", (evt) => {
        console.log(Buffer.from(evt.detail.data).toString());
    });
    node2.pubsub.publish("districhan", new TextEncoder().encode("sex"));

    // if someone attempts getting /, return a message
    app.get("/", (req, res) => res.status(200).send(`<!DOCTYPE HTML>
<html>
    <head>
        <meta charset="utf-8">
        <title>districhan gateway</title>
    </head>
    <body style="font-family: sans-serif">
        <h1>You've connected to a districhan gateway.</h1>
        <h2>For further information, <a href="https://github.com/parabirb/districhan">click here</a>.</h2>
        <p>Districhan is maintained by <a href="https://github.com/parabirb">parabirb</a> with the support of users like you.</p>
    </body>
</html>`));

    // not found? just redirect to index
    app.get("*", (req, res) => res.redirect("/"));

    app.listen(config.port);
}

main();