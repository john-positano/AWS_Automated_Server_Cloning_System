let SSH = require( 'simple-ssh' );
let fs = require( 'fs' );
let mysql = require( 'mysql' );
let MySQLRootPassword = process.env.MySQLRootPassword;
let MySQLGDSPassword = process.env.MySQLGDSPassword;
let MySQLClonePassword = process.env.MySQLClonePassword;
let TSGDBParams = {
  host: '3.81.63.125',
  user: 'clone',
  password: MySQLClonePassword,
  database: 'clone'  
};

module.exports = class TSGMysqlPumpDatabaseTransferrerService {
  constructor ( emitter, event ) {
    this._event = event;
    this._emitter = emitter;
    this._sshRetryCount = 0;
    this._emitter.on( 'clone-db-mysql-config-success', ( event ) => { this.connect( event, () => { this.transfer( event ); } ); } );
    this._emitter.on( 'clone-file-dns-register-success', ( event ) => { this.subEvent = event; } );
    this._emitter.once(
      'clone-db-mysql-install-delete-users',
      ( event ) => {
        this.connect( event, () => { this.mysqlDeleteUsers( event ); } );
      }
    );
  }

  get subEvent () {
    return this._subEvent;
  }

  set subEvent ( val ) {
    this._subEvent = val;
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
        this._emitter.emit( 'clone-db-error', err );
      }
    );
    this._ssh.start();
  }

  transfer ( event ) {
    let output = [];

    this._ssh
      .exec( `sudo mysqlpump --exclude-tables=mm_log_events --insert-ignore --default-parallelism=100 --include-databases=topgolf_wp894 --skip-defer-table-indexes --user=tsg_gds_user --password=${ MySQLGDSPassword } --host=gds.slave.topspeedgolf.com | mysql -u root --password=${ MySQLRootPassword }`,
        { 
          pty: true, 
          out: ( chunk ) => {
            output.push( chunk.toString() );
          },
          err: ( err ) => {
            output.push( err );
            this._emitter.emit( 'log', output.join( '\n' ), ( 'clone-db-mysqlpump-database-transfer-error' ), 500 );
            this._emitter.emit( 'clone-db-error', err );        
          },
          exit: () => {
            this._emitter.emit( 'log', output.join( '\n' ), ( 'clone-db-mysqlpump-database-transfer-success' ), 200 );
            this._emitter.emit( 'clone-db-mysql-install-delete-users', event );
            this.config( event );
          }
        }      
      );
  }

  config ( event ) {
    switch ( this._event[ 'clone-type' ] ) {
      case 'test':
        this._ssh.exec( `sudo mysql -u root --password=${ MySQLRootPassword } -e "UPDATE topgolf_wp894.wp_ldgs_options SET option_value = 'http://${ this._event[ "clone-name" ] }.topspeedsports.world' WHERE option_name IN ( 'siteurl', 'home' )"`, { pty: true, out: console.log, err: console.log, exit: console.log } );
        break;
      case 'dry-production':
        this._ssh.exec( `sudo mysql -u root --password=${ MySQLRootPassword } -e "UPDATE topgolf_wp894.wp_ldgs_options SET option_value = 'https://${ this._event[ "clone-name" ] }.topspeedgolf.com' WHERE option_name IN ( 'siteurl', 'home' )"`, { pty: true, out: console.log, err: console.log, exit: console.log } );
        break;
    }
  }

  connect2 ( event, callback ) {
    this._ssh2 = new SSH(
      {
        host: event.Reservations[ 0 ].Instances[ 0 ].PublicDnsName,
        user: 'ubuntu',
        key: fs.readFileSync( __dirname + '/../TSGCloneKeyPair.pem' ),
        timeout: 10000      
      }
    );
    this._ssh2.on( 'ready', callback );
    this._ssh2.on( 
      'error', 
      async ( err ) => {
        this._emitter.emit( 'clone-db-error', err );
      }
    );
    this._ssh2.start();
  }

  transfer2 ( event ) {
    let output = [];

    this._ssh2
      .exec(
        ( `sudo mysqlpump --max-allowed-packet=1GB --include-tables=mm_log_events --insert-ignore --include-databases=topgolf_wp894 --skip-defer-table-indexes --user=tsg_gds_user --password=${ MySQLGDSPassword } --host=gds.slave.topspeedgolf.com --extended-insert=200000 | mysql -u root --password=${ MySQLRootPassword }` ),
        { 
          pty: true, 
          out: ( chunk ) => {
            output.push( chunk.toString() );
          },
          err: ( err ) => {
            output.push( err );
            this._emitter.emit( 'log', output.join( '\n' ), ( 'clone-db-mysqlpump-database-transfer-2-error' ), 500 );
            this._emitter.emit( 'clone-db-error', err );        
          },
          exit: () => {
            this._emitter.emit( 'log', output.join( '\n' ), ( 'clone-db-mysqlpump-database-transfer-2-success' ), 200 );
            this._emitter.emit( 'clone-db-mysqlpump-database-transfer-2-success', event );
          }
        }      
      );
  }

  mysqlDeleteUsers ( event ) {
    let output = [];

    this._ssh
    .exec(
      `sudo mysql -u root --password=${ MySQLRootPassword } -e "USE topgolf_wp894; DELETE FROM wp_ldgs_users WHERE ID NOT IN ( SELECT u.ID FROM ( SELECT * FROM wp_ldgs_users ) u JOIN wp_ldgs_usermeta um ON u.ID = um.user_id AND um.meta_key = 'wp_ldgs_capabilities' AND um.meta_value LIKE '%administrator%' );"`, 
      { 
        pty: true,
        out: ( chunk ) => { output.push( chunk ); }, 
        err: ( err ) => {
          output.push( err );
          this._emitter.emit( 'log', output.join( '\n' ), ( 'clone-db-mysql-config-error' ), 500 );
          this._emitter.emit( 'clone-db-error', err );        
        },
        exit: ( a, b, c ) => { 
          this._ssh.end();
          this._emitter.emit( 'log', output.join( '\n' ), ( 'clone-db-mysql-config-success' ), 200 );
          this._emitter.emit( 'clone-db-mysqlpump-database-transfer-success', event );
        } 
      } 
    );
  }
}