let SSH = require( 'simple-ssh' );
let fs = require( 'fs' );

module.exports = class TSGCloneFileInstallerService {
  constructor ( emitter, event ) {
    this._event = event;
    this._emitter = emitter;

    this._emitter.once( 
      'clone-file-ping-success', 
      ( event ) => { 
        this.connect(
          event,
          () => { 
            this.install( event ); 
          } 
        ); 
      } 
    );
  }

  install ( event ) {
    this._ssh
      .exec(
`cat <<EOF > production.key
-----BEGIN RSA PRIVATE KEY-----
MIIEpgIBAAKCAQEA35dkeJHHUZXmlL4CsJnfpDATIiekSy9cT2ifIqF/2poef1p+
PMdKtL79FPb7u3WPz22fKmexL72Mp3NOqsvAFMXc9bd0pERI8MLfQfbzFvUHd0Yc
agPQvakXlvnp3angK2k66EgQdnwIcY5OLreluWSNILBbIP7B7zwiM7ve2JdE+0ue
7M2KwBwpfH73OXuOxlWOK+4Oxgqc0/MAMDzuHZENTOflAF+IelY+ZcjFlZUK0MiV
ctG42c8xjBtAbqrIpPaFEwkF1DSYVawRV7PgxDV4ILRl4Es4zZN8/+hMP2IIYExh
GzH9Rbinnaswe7UuGuKsm/G6uGwQ3yOAyrxVbwIDAQABAoIBAQDJNfNrcTzelbhg
SLIg/Qg+OCkvxl7abi9zIqJ6xr1JGwKw9t29klcPWwRjtnQJWZ1mPK9MuO3CGaEX
G/RCTYN47iqPUV39aZn+WFATi8ls8mqakpSFbxONajrZWeN04CfkyRkC6b8u8SWk
Ez0WW5wev3clYK9RfRFHWmUpCztayu/YpdAC9o4aGMb+fqkeR1U4NP3OrjwRNy+q
qjC581xyMDSunO3H8cDF0/jMT7H4OgRHKXRe5WIHn/BRWbsZfiULm6PP+iIcS2S8
ZHarGsuTHKYCCbgl3v23peywuhHi2rVkF185yelh17bqXooHPsqwD8cpFJKAC2Ma
mndtTuMhAoGBAPLTWoZ13w4Pq9+65sm3oaKzBxNahXTsayBkpMgVIfmP52cXXewz
eHvOtW/zPhPI78MpCeYMfKlqCJ0/Oz/Z3iLoKtRGYVDQC7zU4zkPLakYLQ/3jTm9
1kJZqvJsPSSweG9idN3sn/Ecpgw7uUxk9dSI2lj/AeqaOTtJ1xzK/GVxAoGBAOu4
5DSKgW1k6VGaXWty7RIxYLpXQwZcVSgoKZl6yVKk0CJdwucHvPI4XNVFDb85tr2A
+aEUDS7yD6r3TpwBv9GBbft4KgJq1O0OxGU4+VaBFLU0axKhbOUqWTcQUh7KWMY2
rf8wobiPYuXBX2ZvmPcwjmnXnXw1xNhlX/eJA3jfAoGBAO81mFsXaQogFBANveb/
eEKgHJtLNGdvs0SxAMd+Uf7YbXxYP5U9Szaj9ob3V7MD4nYeSnsO2AvIwf2uWb7X
8IXwsqh1QM7sdHOsQL9oHXITt+if1McKJTUtwkKYsE8hbTNFCZ3JyfIrZ8RrXWpN
lwKtYnQDmq6zCShH4JqjuKpxAoGBALWZDi4wGj/lwx3710alFmCyq7tC6L7ouS4j
qtCz2I+Tq0kehL2pp3XP2CzxcwLD+rWJvEbNBM8K6ukid2wWqOlFVi6qR2rvVLSA
cOsudmCfNw3WoTqMJDF0a6DRMQLJjpS9oVR86coepOkuDUoEZYrh3IVL9+auIcU4
bDNuWb9vAoGBALWg9lz3pjuI3ni/PwsvLdDgmB6YKPfE99jn9DzspzwZvn69gMbt
YTt0qpB4uyLevt4b9CDS3Vayng1vC83H7628wBsT/aTRJA5NzCD4S0tPW+U8TGCz
oVNynR9f3Q1PmLecXkqC4jJixBmY0EkSiC6pKq0hDrm0QiRquEq6xEiO
-----END RSA PRIVATE KEY-----
EOF
`,
        {
          pty: true,
          out: console.log,
          err: console.log,
          exit: console.log
        }
      )
      .exec(
        `sudo mv ./production.key /etc/ssl/certs/production.key`,
        {
          pty: true,
          out: console.log,
          err: console.log,
          exit: console.log
        }
      )
      .exec(
`cat <<EOF > production.cert
-----BEGIN CERTIFICATE-----
MIIHXTCCBkWgAwIBAgIMLQ/PaZzpHJxgoiNpMA0GCSqGSIb3DQEBCwUAMGIxCzAJ
BgNVBAYTAkJFMRkwFwYDVQQKExBHbG9iYWxTaWduIG52LXNhMTgwNgYDVQQDEy9H
bG9iYWxTaWduIEV4dGVuZGVkIFZhbGlkYXRpb24gQ0EgLSBTSEEyNTYgLSBHMzAe
Fw0xODA3MTYyMDQzMzJaFw0yMDA3MTYyMDQzMzJaMIIBBjEdMBsGA1UEDwwUUHJp
dmF0ZSBPcmdhbml6YXRpb24xFzAVBgNVBAUTDkVJTiA0Ny01MTU3NjQ5MRMwEQYL
KwYBBAGCNzwCAQMTAlVTMRgwFgYLKwYBBAGCNzwCAQITB0ZMT1JJREExCzAJBgNV
BAYTAlVTMRAwDgYDVQQIEwdGbG9yaWRhMRIwEAYDVQQHEwlMYWtlIE1hcnkxHzAd
BgNVBAkTFjQzMDAgVyBMQUtFIE1BUlkgQkxWRCwxDDAKBgNVBAsTA1dlYjEcMBoG
A1UEChMTVG9wIFNwZWVkIEdvbGYsIExMQzEdMBsGA1UEAxMUd3d3LnRvcHNwZWVk
Z29sZi5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDfl2R4kcdR
leaUvgKwmd+kMBMiJ6RLL1xPaJ8ioX/amh5/Wn48x0q0vv0U9vu7dY/PbZ8qZ7Ev
vYync06qy8AUxdz1t3SkREjwwt9B9vMW9Qd3RhxqA9C9qReW+endqeAraTroSBB2
fAhxjk4ut6W5ZI0gsFsg/sHvPCIzu97Yl0T7S57szYrAHCl8fvc5e47GVY4r7g7G
CpzT8wAwPO4dkQ1M5+UAX4h6Vj5lyMWVlQrQyJVy0bjZzzGMG0Buqsik9oUTCQXU
NJhVrBFXs+DENXggtGXgSzjNk3z/6Ew/YghgTGEbMf1FuKedqzB7tS4a4qyb8bq4
bBDfI4DKvFVvAgMBAAGjggNrMIIDZzAOBgNVHQ8BAf8EBAMCBaAwgZYGCCsGAQUF
BwEBBIGJMIGGMEcGCCsGAQUFBzAChjtodHRwOi8vc2VjdXJlLmdsb2JhbHNpZ24u
Y29tL2NhY2VydC9nc2V4dGVuZHZhbHNoYTJnM3IzLmNydDA7BggrBgEFBQcwAYYv
aHR0cDovL29jc3AyLmdsb2JhbHNpZ24uY29tL2dzZXh0ZW5kdmFsc2hhMmczcjMw
VQYDVR0gBE4wTDBBBgkrBgEEAaAyAQEwNDAyBggrBgEFBQcCARYmaHR0cHM6Ly93
d3cuZ2xvYmFsc2lnbi5jb20vcmVwb3NpdG9yeS8wBwYFZ4EMAQEwCQYDVR0TBAIw
ADBFBgNVHR8EPjA8MDqgOKA2hjRodHRwOi8vY3JsLmdsb2JhbHNpZ24uY29tL2dz
L2dzZXh0ZW5kdmFsc2hhMmczcjMuY3JsMDEGA1UdEQQqMCiCFHd3dy50b3BzcGVl
ZGdvbGYuY29tghB0b3BzcGVlZGdvbGYuY29tMB0GA1UdJQQWMBQGCCsGAQUFBwMB
BggrBgEFBQcDAjAdBgNVHQ4EFgQUNDYqKlib0NEYpVnFNif8QjtSg50wHwYDVR0j
BBgwFoAU3bPnbagu6MVObs905nU8lBXO6B0wggF/BgorBgEEAdZ5AgQCBIIBbwSC
AWsBaQB3AFWB1MIWkDYBSuoLm1c8U/DA5Dh4cCUIFy+jqh0HE9MMAAABZKTVhb4A
AAQDAEgwRgIhAI1HwVYkoIK1y4Z5SgaF42+GBpva3GSf0ElaFHLXDDngAiEAzt1Y
h+ps1q0NxT6YLK7yV4yLoUvotue/jzoqWt6dT40AdgCHdb/nWXz4jEOZX73zbv9W
jUdWNv9KtWDBtOr/XqCDDwAAAWSk1YaqAAAEAwBHMEUCIQC7Psdt6Td5VP1IiIcK
jDBmynsE3okJfPFZhZz0O2eH4wIgN2u3lXXN5HrDfMVr/P+I1h1BHoebt5wYz4ew
aJOBsX0AdgC72d+8H4pxtZOUI5eqkntHOFeVCqtS6BqQlmQ2jh7RhQAAAWSk1Yfw
AAAEAwBHMEUCIQDFReZKh/MkOGA6DNVBeJMxjC2hbsQpNTkujlJBq7HJSgIgb+Cv
DBdBrZdXwJhFEsBy38rMvcM+AOQxb20vS3VqwqwwDQYJKoZIhvcNAQELBQADggEB
AJo17lgnhKbdZFHbrKRL6l0w1ZrEqIuZizyeEGWfuiEirc7k1L5AO5gKZEEgeIlu
oj+HLNQjVZnGvr4pahF7rf/7hZKnCPGl+hOcYlRegelmYNK7dm789bdrw8dV3KHM
zAz+5/X8kbCxT8z14Jrn0P+biHtPsgNsxIzgMAlykUP7aSFsUmF8aUVccmWqUZtr
AqjsUp6RWZVXyBFAj4ep00CCbI5bq3qPG4G3777jgyA3EfL6kwkPSgHlf4bcfVzb
R6YlWd8p7mVAVn/HYWuJSdzVrVtw3rzhsae0EVOZazD3KmkeYcFB8+S8ECExfN7p
0WNK1OxUMDnagdmaswt46Ys=
-----END CERTIFICATE-----
EOF
`,
        {
          pty: true,
          out: console.log,
          err: console.log,
          exit: console.log
        }
      )
      .exec(
        `sudo mv ./production.cert /etc/ssl/certs/production.cert`,
        {
          pty: true,
          out: console.log,
          err: console.log,
          exit: console.log
        }
      );
  }

  connect ( event, callback ) {
    this._ssh = new SSH(
      {
        host: event.Reservations[ 0 ].Instances[ 0 ].PublicDnsName,
        user: 'ubuntu',
        key: fs.readFileSync( __dirname + '/../TSGCloneKeyPair.pem' ),
        timeout: 10000      
      }
    );

    this._ssh.on( 'ready', callback );
    this._ssh.on( 
      'error', 
      async ( err ) => {
        if ( this._sshRetryCount < 100 ) {
          await new Promise( ( _succ ) => { setTimeout( _succ, 5000 ) } );
          this._sshRetryCount++;
          return this.connect( event, callback );
        }
        this._emitter.emit( 'clone-file-error', err );
      }
    );

    this._ssh.start();
  }
}