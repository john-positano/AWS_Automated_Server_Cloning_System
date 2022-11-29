let SSH = require( 'simple-ssh' );
let fs = require( 'fs' );
let GithubToken = process.env.GithubToken;

module.exports = class TSGGitFileTransferrerService {
  constructor ( emitter ) {
    this._emitter = emitter;

    this._sshRetryCount = 0;

    this._emitter.on( 
      'clone-file-git-install-success', 
      ( event ) => { 
        this.connect( event, () => { this.transfer( event ); } ); 
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
        this._emitter.emit( 'clone-file-error', err );
      }
    );

    this._ssh.start();
  }

  transfer ( event ) {
    let output = [];

    this._ssh
      .exec( `sudo rm /var/www/html/index.html`, { pty: true, err: console.log, exit: console.log } )
      .exec( `sudo git clone --depth 24 https://jpositano-at-703566420440:${ GithubToken }=@git-codecommit.us-east-1.amazonaws.com/v1/repos/tsg-backup /var/www/html/`, { pty: true, err: console.log, exit: console.log } ) 
      .exec( `sudo chown -R www-data:www-data /var/www/html/wp-content /var/www/html/wp-admin /var/www/html/wp-includes`, { pty: true, err: console.log, exit: console.log } )
      .exec(
        'echo "done"',
        { 
          pty: true,
          out: ( chunk ) => {
            output.push( chunk.toString() );
          },
          err: ( err ) => {
            output.push( err );
            this._emitter.emit( 'log', output.join( '\n' ), ( 'clone-git-file-transfer-error' ), 500 );
            this._emitter.emit( 'clone-file-error', err );        
          },
          exit: () => {
            this._emitter.emit( 'log', output.join( '\n' ), ( 'clone-git-file-transfer-success' ), 200 );
            this._emitter.emit( 'clone-git-file-transfer-success', event );
            this._ssh.end();
          }
        }      
      );
  }
}