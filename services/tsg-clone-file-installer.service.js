let SSH = require( 'simple-ssh' );
let fs = require( 'fs' );
let PrivateKey = process.env.PrivateKey;
let Cerificate = process.env.Cerificate;

module.exports = class TSGCloneFileInstallerService {
  constructor ( emitter ) {
    this._emitter = emitter;

    this._sshRetryCount = 0;
    this._stackStep = 0;
    this._stack = [
      'aptGetUpdate',
      'installCertificate',
      'aptInstallPHP',
      'aptInstallApache2',
      'aptInstallGit'
    ];

    this._emitter.once( 
      'clone-file-ping-success', 
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
        this._emitter.emit( 'clone-file-error', err );
      }
    );

    this._ssh.start();
  }

  async stackStep ( event ) {
    if ( this._stackStep >= this._stack.length ) {
      this._emitter.emit( 'clone-file-installed', event );
      return;
    }

    // await new Promise( ( _succ ) => { setTimeout( _succ, 5000 ); } );

    this._stackStep++;
    this[ this._stack[ this._stackStep - 1 ] ]( event );
  }

  installCertificate ( event ) {
    let output = [];

    this.connect(
      event,
      () => {
        this._ssh
          .exec(
`cat <<EOF > production.key
${ PrivateKey }
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
${ Cerificate }
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
            this.config( 
              'clone-file-certificate-install', 
              output, 
              event
            ) 
          );
      }
    );
  }

  aptGetUpdate ( event ) {
    let output = [];
    let output2 = [];
    let output3 = [];

    this.connect( event, () => { 
      this._ssh
        .exec( `sudo apt-get update`, this.config( 'clone-file-apt-get-update', output3, event, ( event ) => { setTimeout( () => { this._ssh.end(); this.aptGetUpdate( event ); }, 10000 ); } ) ); 
      } 
    );
  }

  aptInstallApache2 ( event ) {
    let output = [];

    this.connect( event, () => { this._ssh.exec( 'sudo apt-get install -y apache2-utils apache2-bin apache2 libapache2-mod-php7.2', this.config( 'clone-file-apache2-install', output, event, /* ( event ) => { setTimeout( () => { this._ssh.end(); this.aptInstallApache2( event ); }, 10000 ); } */ this.aptInstallGit ) ) } )
  }

  async aptInstallGit ( event ) {
    let output = [];

    this.connect( 
      event, 
      () => { 
        this._ssh.exec( 
          'sudo apt-get install -y git', 
          { 
            pty: true, 
            out: ( chunk ) => { 
              output.push( chunk.toString() );
            },
            err: ( err ) => {
              output.push( err );
              this._emitter.emit( 'log', output.join( '\n' ), ( 'clone-file-git-install-error' ), 500 );
              this._emitter.emit( 'clone-file-error', err );        
            },
            exit: ( code ) => {
              if ( code != 0 ) { this._ssh.end(); this.aptInstallGit( event ); return; }
              this._emitter.emit( 'log', output.join( '\n' ), ( 'clone-file-git-install-success' ), 200 );
              this._ssh.end();
              this._emitter.emit( 'clone-file-git-install-success', event );
            } 
          } 
        ) 
      } 
    );
  }

  aptInstallPHP ( event ) {
    let output = [];

    this.connect( event, () => { this._ssh.exec( 'sudo apt-get install php -y && sudo apt-get install php-{bcmath,bz2,intl,gd,mbstring,mysql,zip,fpm,curl,xml} -y', this.config( 'clone-file-php-install', output, event, ( event ) => { setTimeout( () => { this._ssh.end(); this.aptInstallPHP( event ); }, 10000 ); } ) ) } )
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
        this._emitter.emit( 'clone-file-error', err );     
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