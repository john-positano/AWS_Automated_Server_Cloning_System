let SSH = require( 'simple-ssh' );
let fs = require( 'fs' );
let AWS = require( 'aws-sdk' );
let Route53 = new AWS.Route53();

module.exports = class TSGCloneFileDNSRegistererService {
  constructor ( emitter, event ) {
    this._event = event;
    this._emitter = emitter;
    this._emitter.on( 'clone-git-file-transfer-success', ( event ) => { this.register( event ); } );
  }

  register ( event ) {
    if ( this._event[ 'clone-type' ] != 'test' ) { return; }

    Route53.changeResourceRecordSets(
      {
        ChangeBatch: {
          Changes: [
            {
              Action: "CREATE", 
              ResourceRecordSet: {
                Name: event[ "clone-name" ] + ".topspeedsports.world", 
                ResourceRecords: [ { Value: event.Reservations[ 0 ].Instances[ 0 ].PublicDnsName } ], 
                TTL: 60, 
                Type: "CNAME"
              }
            }
          ]
        }, 
        HostedZoneId: "Z3OIRSCJ4TH2AW"
      },
      ( err, data ) => {
        if ( err ) {
          this._emitter.emit( 'log', err, 'clone-file-error', 500 );
          this._emitter.emit( 'clone-file-error', err );
          // return;
        }

        this._emitter.emit( 'log', '', ( 'clone-file-dns-register-success' ), 200 );
        this._emitter.emit( 'clone-file-dns-register-success', event );
      }
    );
  }
}