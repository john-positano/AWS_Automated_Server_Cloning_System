let AWS = require( 'aws-sdk' );
let ELBv2 = new AWS.ELBv2();
let CertificateArn = process.env.CertificateArn;
let Subnets = process.env.Subnets;

module.exports = class TSGCloneFileLoadBalancerConfigurer {
  constructor ( emitter ) {
    this._emitter = emitter;
    this._emitter.on( 'clone-file-git-install-success', ( event ) => { this.createLoadBalancer( event ); } );
  }

  createLoadBalancer ( event ) {
    ELBv2.createLoadBalancer(
      {
        Name: "clone-" + event.Reservations[ 0 ].Instances[ 0 ].InstanceId,
        Type: "application",
        Subnets
      },
      ( err, data ) => {
        if ( err ) {
          this._emitter.emit( 'log', err, 'clone-db-error', 500 );
          this._emitter.emit( 'clone-db-error', err );
          return;
        }

        this._emitter.emit( 'log', data, 'clone-file-load-balancer-success', 200 );
        this._emitter.emit( 'clone-file-load-balancer-success', data );
      
        this.loadBalancerData = data;
        this.createTargetGroup( event );
      }
    );
  }

  createTargetGroup ( event ) {
    ELBv2.createTargetGroup(
      {
        Name: "clone-" + event.Reservations[ 0 ].Instances[ 0 ].InstanceId,
        Port: 80,
        Protocol: "HTTP",
        VpcId: this.loadBalancerData.LoadBalancers[ 0 ].VpcId
      },
      ( err, data ) => {
        if ( err ) {
          this._emitter.emit( 'log', err, 'clone-db-error', 500 );
          this._emitter.emit( 'clone-db-error', err );
          return;
        }

        this._emitter.emit( 'log', data, 'clone-file-create-target-group-success', 200 );
        this._emitter.emit( 'clone-file-create-target-group-success', data );
      
        this.targetGroupData = data;
        this.registerTargets( event );
      }
    );
  }

  registerTargets ( event ) {
    ELBv2.registerTargets(
      {
        TargetGroupArn: this.targetGroupData.TargetGroups[ 0 ].TargetGroupArn,
        Targets: [
          {
            Id: event.Reservations[ 0 ].Instances[ 0 ].InstanceId,
            Port: 80
          }
        ]
      },
      ( err, data ) => {
        if ( err ) {
          this._emitter.emit( 'log', err, 'clone-db-error', 500 );
          this._emitter.emit( 'clone-db-error', err );
          return;
        }

        this._emitter.emit( 'log', data, 'clone-file-register-target-success', 200 );
        this._emitter.emit( 'clone-file-register-target-success', data );
      
        this.createListener( event );
      }
    );
  }

  createListener ( event ) {
    ELBv2.createListener(
      {
        Certificates: [
          {
            CertificateArn
          }
        ], 
        DefaultActions: [
          {
            TargetGroupArn: this.targetGroupData.TargetGroups[ 0 ].TargetGroupArn, 
            Type: "forward"
          }
        ], 
        LoadBalancerArn: this.loadBalancerData.LoadBalancers[ 0 ].LoadBalancerArn, 
        Port: 443, 
        Protocol: "HTTPS", 
        SslPolicy: "ELBSecurityPolicy-2015-05"
      },
      ( err, data ) => {
        if ( err ) {
          this._emitter.emit( 'log', err, 'clone-db-error', 500 );
          this._emitter.emit( 'clone-db-error', err );
          return;
        }

        this._emitter.emit( 'log', data, 'clone-create-listener-success', 200 );
        this._emitter.emit( 'clone-create-listener-success', data );
      }
    );
  }
}