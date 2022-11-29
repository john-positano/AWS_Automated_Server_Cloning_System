let SSH = require( 'simple-ssh' );
let fs = require( 'fs' );
let MySQLRootPassword = process.env.MySQLRootPassword;

module.exports = class TSGCloneDBInstallerService {
  constructor ( emitter ) {
    this._emitter = emitter;

    this._sshRetryCount = 0;
    this._stackStep = 0;
    this._stack = [
      'aptGetUpdate',
      'aptInstallMysqlServer'
    ];

    this._emitter.once( 
      'clone-db-ping-success', 
      async ( event ) => {
        this.connect( 
          event, 
          ( succ ) => {
            this.stackStep( event );
          }
        );
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
        this._emitter.emit( 'clone-db-error', err );
      }
    );

    this._ssh.start();
  }

  async stackStep ( event ) {
    if ( this._stackStep >= this._stack.length ) {
      this._emitter.emit( 'clone-db-installed', event );
      return;
    }

    // await new Promise( ( _succ ) => { setTimeout( _succ, 5000 ); } );

    this._stackStep++;
    this[ this._stack[ this._stackStep - 1 ] ]( event );
  }

  aptGetUpdate ( event ) {
    let output = [];
    let output2 = [];
    let output3 = [];

    this.connect( event, () => { 
      this._ssh
        .exec( `sudo apt-get update`, this.config( 'clone-db-apt-get-update', output3, event, ( event ) => { setTimeout( () => { this._ssh.end(); this.aptGetUpdate( event ); }, 10000 ); } ) ); 
      } 
    );
  }

  aptInstallMysqlServer ( event ) {
    let output = [];

    this.connect(
      event,
      () => {
        this._ssh
          .exec( `sudo debconf-set-selections <<< \'mysql-server mysql-server/root_password password ${ MySQLRootPassword }\'`, { pty: true } )
          .exec( `sudo debconf-set-selections <<< \'mysql-server mysql-server/root_password_again password ${ MySQLRootPassword }\'`, { pty: true } )
          .exec( `sudo debconf-set-selections <<< \'* libraries/restart-without-asking boolean true\'`, { pty: true } )
          .exec( 
            'sudo apt-get install -y mysql-server',
            { 
              pty: true, 
              out: ( chunk ) => {
                output.push( chunk.toString() );
              },
              err: ( err ) => {
                output.push( err );
                this._emitter.emit( 'log', output.join( '\n' ), ( 'clone-db-mysql-install-error' ), 500 );
                this._emitter.emit( 'clone-error', err );        
              },
              exit: ( code ) => {
                if ( code != 0 ) { this._ssh.end(); this.aptInstallMysqlServer( event ); return; }
                this._emitter.emit( 'log', output.join( '\n' ), ( 'clone-db-mysql-install-success' ), 200 );
                this._emitter.emit( 'clone-db-mysql-install-success', event );
                this._ssh.end();
                this.stackStep( event );
              } 
            } 
          );
      }
    );
  }

  config ( logTitle, output, event, recover ) {
    return { 
      pty: true, 
      out: ( chunk ) => { 
        output.push( chunk.toString() );
      },
      err: ( err ) => {
        output.push( err );
        this._emitter.emit( 'log', output.join( '\n' ), ( logTitle + '-error' ), 500 );
        this._emitter.emit( 'clone-db-error', err );     
      },
      exit: ( code, b, c ) => {
        if ( ![ 0, 200, '0', '200' ].includes( code ) ) { if ( recover ) { recover( event ); } return; }
        this._emitter.emit( 'log', output.join( '\n' ), ( logTitle + '-success' ), 200 );
        this._ssh.end();
        this.stackStep( event );
      } 
    } 
  }
}