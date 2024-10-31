export const config = {
    port: 8080,
    origin: "http://localhost:3000",
    backendUrl: "http://localhost:8080",
    flaskUrl: "http://localhost:5000/flask",
    domain: "localhost",
    secure: false,
    initialModelOptions: ["Conv2d"],
    neo4jUri: "neo4j://xxxxxxxxxxxxx.ap-southeast-1.compute.amazonaws.com:7687",
    neo4jUser: "neo4j",
    neo4jPassword: "panther-xxxxxxxxxxxxx",
    dbUri: "mongodb://xxxxxxxxxxxxx.ap-southeast-1.compute.amazonaws.com:27017/",
    saltWorkFactor: 10, // Number of rounds to salt the password
    accessTokenTtl: "15m",
    refreshTokenTtl: "1y",
    publicKey: `-----BEGIN PUBLIC KEY-----
xxxxxxxxxxxxx
JUFr94asy45Bk9en9pJ7Q9yJ+c9M0pK/imfiNLU7DlLxlJg5uw1Ni/+/f5ePHjE6
juji3He4huyMjvtoKsmCkLMvCuHr75fIibwItAltm3iBaaOAUjPsO1wAiphsHqn/
ntSIAy9w1fyy8Ar1onm4UvvrK4TWLMNrA9V4JoDtos6OXDLfbcxKYFI3KXmG9WQZ
PYWqzpQH8g8aN+A2JLSKTq9fbkFvrh5h30nb/rdX3Mz9TQhBiZpAOqFAf3bwHZf0
x7nrsVwAFRYH3S8BW00Xq/WvnG3mo9PGtjDgtSRs5kt4UMLHfl9s0q1Ot3wyWZ4y
CQIDAQAB
-----END PUBLIC KEY-----`,
      privateKey: `-----BEGIN PRIVATE KEY-----
xxxxxxxxxxxxx
LsknqTwlQWv3hqzLjkGT16f2kntD3In5z0zSkr+KZ+I0tTsOUvGUmDm7DU2L/79/
l48eMTqO6OLcd7iG7IyO+2gqyYKQsy8K4evvl8iJvAi0CW2beIFpo4BSM+w7XACK
mGweqf+e1IgDL3DV/LLwCvWiebhS++srhNYsw2sD1XgmgO2izo5cMt9tzEpgUjcp
eYb1ZBk9harOlAfyDxo34DYktIpOr19uQW+uHmHfSdv+t1fczP1NCEGJmkA6oUB/
dvAdl/THueuxXAAVFgfdLwFbTRer9a+cbeaj08a2MOC1JGzmS3hQwsd+X2zSrU63
fDJZnjIJAgMBAAECggEABYBcb51SUwzLJz0Z7Iv8XAhFf3yt6Nb8tYhSOIHl4Qcl
vTbxdwABFJQDPr+IWZChQciNFiD8XY7Y13eRK3SZOVZ52nJ195MC4cFHElixjpmD
f0efrPAdH520sZLST1ssCsztsBxtrgNYWBf0Bsa8+tnXDg0tRYHhhqce9QsEEbr2
hPep8ZpfFdV3w3GQ6dFLx6sAn1TVNMkRMBwukTWbRVhUKqQiAzTua2Xbusfd/Oce
YIFJES4wdgVLIhLlM+OEUoMkYJQg7XJOpM0h7Gg77i0AKoCLyxgIMk9VkcRuRebl
FwJzupmMKmFKnQ6cRfZK+s6BYdJXvWprPtz8hmFNIQKBgQD1DQrmIpRWpU79e9vZ
a53YArehE+Hy3xwWGNg6WM5YpF/GPRdzu8QZ/sTQBx85U2ak7l8QI67+4LMP8I11
FBPiupp3V/ftgsE1lWLBW0Esxd7Yhjx1mUDYexlKsbyH/hLwXq34m+8boKTGgqgv
8KZRNEwXbM8/zA72iSTcMDNR1QKBgQDnpTerMh/bV9Nfwg0/xDmXp3MCySeozf/5
NE+jTORlwxcrlEYAUitBqrxxCS3p5MDP+ImkveDNE7mRRZQdizUicIF8xs8dQUji
b09EPmDN7O1IxuDVKu9unu5fRCwbb1rgUajTutxcX/H30fA4dgc/f7ueEZtEDOQk
99RxBs7FZQKBgBvFPZ30/0COfVQmrDSIiJvJOwwrF6kRdbpfWGnMVJ4hCqWJmNXJ
yqBzidRVaklx1SkNxoIquRMzXbeJuE4zV0mTghvSQUuOTN0Ir+dfsxQi3G1HUSS2
mG2wDZ60Y7w5o+XPpQGOkltcKjBA8FR2fjKnrZPeBeKh+nQf+KhnYfl9AoGAIl7F
T8V0LJtvZXnpdVisIvBZhERMeiN2o4c7ecNi8CZuPa0WZd3LRUcMBsmR4m5qnXEH
G0aBIGyY0BE+1NNe4ulGjTkCahjRs6dIX5vRyTwqSO4ZVge01vkF7WS0Fq4DEd2L
6z6Ci8JAqMChn/8DPEy7jcyW+RXglAuhndOgwnECgYAzdfdnhuwFh5Iu+2wxE2TZ
BZaIHW7/XsRmJH9FzYMGNzgCHafOdh3p0aiSuCdGotJEKMzd33g4iu9Wi2F7uJZC
OP8tRchCqC9BfqiUUc783kJWT7AJ2da18vC0d6Ukef3L5PFOnCjZ6c2c1aFFcOPx
z4ecmBtONiOChT9kwHvX/g==
-----END PRIVATE KEY-----`,
  
    googleClientId:
      "862932998884-xxxxxxxxxxxxx.apps.googleusercontent.com",
    googleClientSecret: "GOCSPX-xxxxxxxxxxxxx",
    googleOauthRedirectUrl: "http://localhost:8080/api/sessions/oauth/google",
};





  